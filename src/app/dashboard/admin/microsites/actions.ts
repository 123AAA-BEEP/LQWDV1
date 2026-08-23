"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";
import {
  getMicrositeProject,
  generateMicrositeContent,
  normalizeDomain,
  MICROSITE_SECTIONS,
  MICROSITE_SUBPAGES,
  stripDashes,
  extractBrandFromImages,
  type MicrositeConfig,
  type MicrositeContent,
} from "@/lib/microsites";
import type { MicrositeBrand } from "@/lib/microsite-brand";
import {
  checkDomain,
  buyDomain,
  attachDomainToProject,
  ensureDomainServing,
  DOMAIN_MAX_USD,
} from "@/lib/vercel-domains";
import { pingIndexNowForHost } from "@/lib/indexnow";
import { cleanBrandInput } from "@/lib/microsite-brand";
import { pathFromPublicUrl } from "@/lib/upload";

/** Every indexable path a content payload yields — for IndexNow pings. */
function livePaths(content: MicrositeContent | null): string[] {
  return [
    "/",
    ...MICROSITE_SUBPAGES.filter((p) => content?.pages?.[p.key]).map(
      (p) => `/${p.slug}`,
    ),
  ];
}

const LIST = "/dashboard/admin/microsites";

export async function createMicrosite(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const domain = normalizeDomain(String(formData.get("domain") ?? "")) ?? "";
  const projectId = String(formData.get("project_id") ?? "");
  if (!domain) {
    redirectWithFlash(LIST, "Enter the bare domain, e.g. echotownswaterdown.com", "error");
  }
  if (!projectId) redirectWithFlash(LIST, "Pick the project this site is for.", "error");

  const { data, error } = await supabase
    .from("microsite_configs")
    .insert({ domain, project_id: projectId })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") {
    redirectWithFlash(LIST, "That domain already has a microsite.", "error");
  }
  if (error || !data) redirectWithFlash(LIST, "Couldn't create it.", "error");
  revalidatePath(LIST);
  redirect(`${LIST}/${data.id}`);
}

export async function saveMicrositeContext(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const raw = String(formData.get("context") ?? "").trim().slice(0, 8000);
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  // Accept JSON when it parses; otherwise store as questionnaire notes —
  // the generator handles both shapes.
  let context: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      context =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { notes: raw };
    } catch {
      context = { notes: raw };
    }
  }

  // Section picker: checked keys become the explicit section list; checking
  // everything off falls back to the facts-driven auto pick.
  const valid = new Set(MICROSITE_SECTIONS.map((s) => s.key));
  const picked = formData
    .getAll("sections")
    .map(String)
    .filter((k) => valid.has(k));
  if (picked.length) context.sections = picked;
  else delete context.sections;
  await supabase
    .from("microsite_configs")
    .update({ context, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(`${LIST}/${id}`, "Context saved — regenerate to apply it.");
}

export async function generateMicrosite(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const { data } = await supabase
    .from("microsite_configs")
    .select("id, domain, project_id, skin, status, context, content, capture_key")
    .eq("id", id)
    .maybeSingle();
  const config = (data as MicrositeConfig | null) ?? null;
  if (!config) redirectWithFlash(LIST, "Microsite not found.", "error");

  const project = await getMicrositeProject(config.project_id);
  if (!project) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "The project isn't publicly visible — publish it (or check the id) first.",
      "error",
    );
  }

  const content = await generateMicrositeContent(config, project);
  if (!content) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "Generation didn't complete — check ANTHROPIC_API_KEY and try again.",
      "error",
    );
  }
  // Hand-set SEO overrides survive a regenerate; body copy is replaced.
  content.seo_title = config.content?.seo_title ?? null;
  content.seo_description = config.content?.seo_description ?? null;
  content.focus_keywords = config.content?.focus_keywords ?? null;
  await supabase
    .from("microsite_configs")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (config.status === "live") {
    await pingIndexNowForHost(config.domain, livePaths(content));
  }
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    "Content generated — review every fact below, then set it live.",
  );
}

export async function setMicrositeStatus(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "live", "retired"].includes(status)) return;

  const { data: row } = await supabase
    .from("microsite_configs")
    .select("domain, content")
    .eq("id", id)
    .maybeSingle();
  const domain = row?.domain as string | undefined;
  const content = (row?.content as MicrositeContent | null) ?? null;
  if (status === "live" && !content) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "Generate and review content before going live.",
      "error",
    );
  }
  await supabase
    .from("microsite_configs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  // Going live runs the FULL domain pipeline, not just attach: check
  // registration, buy when unregistered and at/under the US$15 cap, attach
  // apex + www, and trust only Vercel's `verified` flag. Attach-only was the
  // liveatfiveoaks.ca failure — Vercel accepts an unowned domain, the site
  // reads "live" everywhere, and the URL dies with NXDOMAIN.
  let domainOk = true;
  let domainNote = "";
  if (status === "live" && domain) {
    const ensured = await ensureDomainServing(domain);
    domainOk = ensured.state === "serving" || ensured.state === "bought";
    domainNote = ensured.detail;
  }
  // Tell IndexNow-fed engines (Bing and friends) the moment it's live;
  // Google discovers via the per-domain sitemap + GSC.
  if (status === "live" && domain && domainOk) {
    await pingIndexNowForHost(domain, livePaths(content));
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  if (status === "live") {
    redirectWithFlash(
      `${LIST}/${id}`,
      domainOk
        ? `Live. ${domainNote}`
        : `Live in the app, but the URL will NOT load yet: ${domainNote}`,
      domainOk ? undefined : "error",
    );
  }
  redirectWithFlash(`${LIST}/${id}`, `Moved to ${status}.`);
}

/** Full manual override of the page content, from the admin editor. */
export async function saveMicrositeContent(input: {
  micrositeId: string;
  content: MicrositeContent;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const id = String(input.micrositeId ?? "");
  const c = input.content;
  if (!id || !c || typeof c !== "object") return { error: "Bad request." };

  const s = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const clean: MicrositeContent = {
    headline: s(c.headline, 200),
    subhead: s(c.subhead, 500),
    intro_md: s(c.intro_md, 8000),
    sections: (Array.isArray(c.sections) ? c.sections : [])
      .slice(0, 14)
      .map((x) => ({
        ...(x?.key ? { key: s(x.key, 40) } : {}),
        title: s(x?.title, 160),
        body_md: s(x?.body_md, 8000),
      }))
      .filter((x) => x.title || x.body_md),
    faq: (Array.isArray(c.faq) ? c.faq : [])
      .slice(0, 8)
      .map((x) => ({ question: s(x?.question, 200), answer: s(x?.answer, 2000) }))
      .filter((x) => x.question && x.answer),
    cta_label: s(c.cta_label, 80) || "Get first access",
    generated_at: s(c.generated_at, 40) || new Date().toISOString(),
    seo_title: s(c.seo_title, 120) || null,
    seo_description: s(c.seo_description, 300) || null,
    edited_at: new Date().toISOString(),
  };
  if (!clean.headline || !clean.subhead || !clean.intro_md) {
    return { error: "Headline, subhead, and intro are required before saving." };
  }

  // The editor covers the home page copy; keep the generated sub-pages and
  // the Search-appearance fields (owned by the SEO card) intact. Brand: an
  // explicit null clears it (Reset to defaults), a valid override wins,
  // anything malformed falls back to what was stored.
  const { data: existing } = await supabase
    .from("microsite_configs")
    .select("content")
    .eq("id", id)
    .maybeSingle();
  const prev = existing?.content as MicrositeContent | null;
  if (prev?.pages) clean.pages = prev.pages;
  clean.seo_title = prev?.seo_title ?? null;
  clean.seo_description = prev?.seo_description ?? null;
  clean.focus_keywords = prev?.focus_keywords ?? null;
  clean.brand =
    c.brand === null ? null : (cleanBrandInput(c.brand) ?? prev?.brand ?? null);

  const { error } = await supabase
    .from("microsite_configs")
    .update({ content: clean, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Couldn't save — try again." };
  revalidatePath(`${LIST}/${id}`);
  return {};
}

/** Lead follow-up automation: toggle + details link (Drive or LIQWD). */
export async function saveMicrositeLeadAutomation(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const enabled = formData.get("auto_send_details") === "on";
  const url = String(formData.get("details_url") ?? "").trim().slice(0, 2000);
  if (url && !/^https:\/\/.+/.test(url)) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "The details link must be a full https URL.",
      "error",
    );
  }
  await supabase
    .from("microsite_configs")
    .update({
      auto_send_details: enabled,
      details_url: url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    enabled
      ? `Auto-send is ON — new leads get ${url ? "your details link" : "the LIQWD listing link"} instantly.`
      : "Auto-send is off — leads are captured but not emailed.",
  );
}

/**
 * Developer logo: records an upload (direct-to-storage path in
 * project-media) or a pasted https URL, or clears it.
 */
export async function saveBuilderLogo(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) return { error: "Missing microsite." };

  let url: string | null = null;
  const path = String(formData.get("path") ?? "");
  const pasted = String(formData.get("url") ?? "").trim().slice(0, 2000);
  const clear = formData.get("clear") === "1";
  if (!clear) {
    if (path) {
      url = supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
    } else if (pasted) {
      if (!/^https:\/\/.+/.test(pasted)) {
        return { error: "Paste a full https image URL." };
      }
      url = pasted;
    } else {
      return { error: "Upload a file or paste a URL." };
    }
  }
  const { error } = await supabase
    .from("microsite_configs")
    .update({ builder_logo_url: url, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Couldn't save the logo: ${error.message}` };
  revalidatePath(`${LIST}/${id}`);
}

/**
 * Swap the microsite onto a different domain — for when the name actually
 * bought differs from the one the config was seeded with (liveatfiveoaks.ca
 * → fiveoaksinoakville.com; origins2brampton.com → origins2homes.com).
 * Content, images, brand, leads, and the capture key all ride along; only
 * the host changes. The old domain stops serving immediately.
 */
export async function renameMicrositeDomain(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  if (!domain) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "Enter a bare domain like origins2homes.com (no https, no www).",
      "error",
    );
  }
  const { data: clash } = await supabase
    .from("microsite_configs")
    .select("id")
    .eq("domain", domain)
    .neq("id", id)
    .maybeSingle();
  if (clash) {
    redirectWithFlash(
      `${LIST}/${id}`,
      `${domain} is already used by another microsite.`,
      "error",
    );
  }
  const { error } = await supabase
    .from("microsite_configs")
    .update({ domain, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    redirectWithFlash(`${LIST}/${id}`, `Couldn't change the domain: ${error.message}`, "error");
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    `Domain changed to ${domain}. Everything carries over; the old domain stops serving. Check the card below — attach or buy if it isn't green.`,
  );
}

/**
 * Site icon (favicon): browser tab + the icon Google shows beside the
 * listing in search results. Same contract as saveBuilderLogo — a storage
 * path from a direct upload, a pasted https URL, or clear.
 */
export async function saveMicrositeFavicon(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) return { error: "Missing microsite." };

  let url: string | null = null;
  const path = String(formData.get("path") ?? "");
  const pasted = String(formData.get("url") ?? "").trim().slice(0, 2000);
  const clear = formData.get("clear") === "1";
  if (!clear) {
    if (path) {
      url = supabase.storage.from("project-media").getPublicUrl(path).data.publicUrl;
    } else if (pasted) {
      if (!/^https:\/\/.+/.test(pasted)) {
        return { error: "Paste a full https image URL." };
      }
      url = pasted;
    } else {
      return { error: "Upload a file or paste a URL." };
    }
  }
  const { error } = await supabase
    .from("microsite_configs")
    .update({ favicon_url: url, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Couldn't save the icon: ${error.message}` };
  revalidatePath(`${LIST}/${id}`);
}

/**
 * Search appearance: meta titles, descriptions, sub-page H1s, and focus
 * keywords for every page of the microsite, in one save. Only pages that
 * exist in the content are touched.
 */
export async function saveMicrositeSeo(input: {
  micrositeId: string;
  home: {
    seo_title: string;
    seo_description: string;
    focus_keywords: string;
  };
  pages: Record<
    string,
    { heading: string; seo_title: string; meta_description: string }
  >;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(input.micrositeId ?? "");
  if (!id) return { error: "Missing microsite." };

  const { data: existing } = await supabase
    .from("microsite_configs")
    .select("content")
    .eq("id", id)
    .maybeSingle();
  const content = existing?.content as MicrositeContent | null;
  if (!content) return { error: "Generate content first." };

  const t = (v: unknown, max: number) =>
    typeof v === "string" ? stripDashes(v.trim().slice(0, max), "title") : "";
  const d = (v: unknown, max: number) =>
    typeof v === "string" ? stripDashes(v.trim().slice(0, max), "body") : "";

  content.seo_title = t(input.home?.seo_title, 120) || null;
  content.seo_description = d(input.home?.seo_description, 300) || null;
  content.focus_keywords = d(input.home?.focus_keywords, 300) || null;

  if (content.pages) {
    for (const key of Object.keys(content.pages) as (keyof typeof content.pages)[]) {
      const edit = input.pages?.[key as string];
      const page = content.pages[key];
      if (!edit || !page) continue;
      page.heading = t(edit.heading, 120) || page.heading;
      page.seo_title = t(edit.seo_title, 120) || page.seo_title;
      page.meta_description = d(edit.meta_description, 300) || page.meta_description;
    }
  }
  content.edited_at = new Date().toISOString();

  const { error } = await supabase
    .from("microsite_configs")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Couldn't save: ${error.message}` };
  revalidatePath(`${LIST}/${id}`);
  return {};
}

/** Google Search Console verification: meta token or googleXXX.html file. */
export async function saveGoogleVerification(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  // Accept the raw token, the whole meta tag (we pull the content), or the
  // HTML filename GSC hands out.
  const raw = String(formData.get("google_verification") ?? "").trim().slice(0, 200);
  let value: string | null = null;
  if (raw) {
    const metaMatch = raw.match(/content=["']([^"']+)["']/i);
    const candidate = metaMatch ? metaMatch[1] : raw;
    if (/^google[a-z0-9]+\.html$/i.test(candidate)) {
      value = candidate.toLowerCase();
    } else if (/^[A-Za-z0-9_-]{20,100}$/.test(candidate)) {
      value = candidate;
    } else {
      redirectWithFlash(
        `${LIST}/${id}`,
        "Paste the verification token, the whole meta tag, or the googleXXX.html filename.",
        "error",
      );
    }
  }
  await supabase
    .from("microsite_configs")
    .update({ google_verification: value, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    value
      ? /\.html$/i.test(value)
        ? `Serving /${value} — hit Verify in Search Console.`
        : "Meta tag added to the page — hit Verify in Search Console."
      : "Verification cleared.",
  );
}

/**
 * Manual override for the Location map: what the Google Maps embed pins and
 * the Location heading shows. An intersection ("Weston Rd & Teston Rd,
 * Vaughan") often pins better than a civic address on a greenfield site.
 * Config-level, so it applies instantly — no regeneration — and
 * regeneration never touches it. Blank clears back to the project address.
 */
export async function saveMicrositeMapAddress(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const raw = String(formData.get("map_address") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  await supabase
    .from("microsite_configs")
    .update({ map_address: raw || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    raw
      ? "Map address saved — the pin and Location heading use it now."
      : "Map address cleared — back to the project address.",
  );
}

/** Pins the brand by hand (colour pickers + font). null clears the override. */
export async function saveMicrositeBrand(input: {
  micrositeId: string;
  brand: unknown | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(input.micrositeId ?? "");
  if (!id) return { error: "Missing microsite." };

  const brand = input.brand === null ? null : cleanBrandInput(input.brand);
  if (input.brand !== null && !brand) {
    return { error: "Colours must be 6-digit hex and the font from the list." };
  }
  const { error } = await supabase
    .from("microsite_configs")
    .update({ brand_override: brand, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Couldn't save: ${error.message}` };
  revalidatePath(`${LIST}/${id}`);
  return {};
}

/**
 * Reads palette + typography off ANY chosen project image (logo, site map,
 * rendering) and pins the result as the brand override.
 */
export async function extractMicrositeBrand(input: {
  micrositeId: string;
  imageUrl: string;
}): Promise<{ error?: string; brand?: MicrositeBrand }> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(input.micrositeId ?? "");
  const url = String(input.imageUrl ?? "");
  if (!id || !/^https:\/\/.+/.test(url)) return { error: "Bad request." };

  const brand = await extractBrandFromImages([url]);
  if (!brand) {
    return {
      error:
        "Couldn't read a palette from that image (check ANTHROPIC_API_KEY, or try another image).",
    };
  }
  const { error } = await supabase
    .from("microsite_configs")
    .update({ brand_override: brand, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Couldn't save: ${error.message}` };
  revalidatePath(`${LIST}/${id}`);
  return { brand };
}

/**
 * Manual image placement: slot -> URL or "none"; missing = auto. Stored on
 * the config so regeneration never disturbs the founder's choices.
 */
export async function saveMicrositeImageSlots(input: {
  micrositeId: string;
  intro: string;
  sections: Record<string, string>;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(input.micrositeId ?? "");
  if (!id) return { error: "Missing microsite." };

  const ok = (v: string) => v === "none" || /^https:\/\/.{5,2000}$/.test(v);
  const slots: { intro?: string; sections?: Record<string, string> } = {};
  if (input.intro && ok(input.intro)) slots.intro = input.intro;
  const sections: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.sections ?? {}).slice(0, 24)) {
    if (typeof k === "string" && k.length <= 40 && typeof v === "string" && v && ok(v)) {
      sections[k] = v;
    }
  }
  if (Object.keys(sections).length) slots.sections = sections;

  const { error } = await supabase
    .from("microsite_configs")
    .update({ image_slots: slots, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: `Couldn't save: ${error.message}` };
  revalidatePath(`${LIST}/${id}`);
  return {};
}

/* ---------------- Microsite image management (project media) -------------- */

/** Records a photo after direct-to-storage upload from the microsite screen. */
export async function recordMicrositeImage(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id || !projectId || !path) return;

  const {
    data: { publicUrl },
  } = supabase.storage.from("project-media").getPublicUrl(path);
  await supabase.from("project_media").insert({
    project_id: projectId,
    media_type: "image",
    url: publicUrl,
    alt_text: String(formData.get("alt_text") ?? "").trim().slice(0, 200) || null,
    is_public: true,
  });
  revalidatePath(`${LIST}/${id}`);
}

export async function deleteMicrositeImage(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const mediaId = String(formData.get("media_id") ?? "");
  if (!id || !mediaId) return;

  const { data: row } = await supabase
    .from("project_media")
    .select("url")
    .eq("id", mediaId)
    .maybeSingle();
  if (row?.url) {
    const path = pathFromPublicUrl(row.url, "project-media");
    if (path) await supabase.storage.from("project-media").remove([path]);
  }
  await supabase.from("project_media").delete().eq("id", mediaId);
  revalidatePath(`${LIST}/${id}`);
}

/** Makes any gallery image the hero photo (the microsite's backdrop). */
export async function setMicrositeHeroImage(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!id || !projectId || !/^https:\/\/.+/.test(url)) return;

  await supabase
    .from("projects")
    .update({ hero_image_url: url })
    .eq("id", projectId);
  revalidatePath(`${LIST}/${id}`);
}

/** One-click domain purchase through the Vercel account (admin-confirmed). */
export async function buyMicrositeDomain(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const { data } = await supabase
    .from("microsite_configs")
    .select("domain")
    .eq("id", id)
    .maybeSingle();
  const domain = data?.domain as string | undefined;
  if (!domain) redirectWithFlash(LIST, "Microsite not found.", "error");

  const check = await checkDomain(domain);
  if (!check) {
    redirectWithFlash(`${LIST}/${id}`, "Couldn't reach the Vercel API.", "error");
  }
  if (!check.available || check.price == null) {
    redirectWithFlash(
      `${LIST}/${id}`,
      "The domain isn't available to buy through Vercel.",
      "error",
    );
  }
  if (check.price > DOMAIN_MAX_USD) {
    redirectWithFlash(
      `${LIST}/${id}`,
      `US$${check.price} is over the US$${DOMAIN_MAX_USD} cap. Pick a cheaper candidate.`,
      "error",
    );
  }
  const bought = await buyDomain(domain, check.price);
  if (!bought.ok) {
    redirectWithFlash(`${LIST}/${id}`, `Purchase failed: ${bought.error}`, "error");
  }
  const attached = await attachDomainToProject(domain);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    attached.ok
      ? attached.error
        ? `Bought ${domain} (US$${check.price}) and attached it — ${attached.error}.`
        : `Bought ${domain} (US$${check.price}); the domain and www both point at the project.`
      : `Bought ${domain} (US$${check.price}) — attach failed (${attached.error}); attach it in Vercel.`,
  );
}

/** Attach an already-owned domain to the Vercel project. */
export async function attachMicrositeDomain(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);
  const id = String(formData.get("microsite_id") ?? "");
  if (!id) redirectWithFlash(LIST, "Missing microsite.", "error");

  const { data } = await supabase
    .from("microsite_configs")
    .select("domain")
    .eq("id", id)
    .maybeSingle();
  const domain = data?.domain as string | undefined;
  if (!domain) redirectWithFlash(LIST, "Microsite not found.", "error");

  const attached = await attachDomainToProject(domain);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    attached.ok
      ? attached.error
        ? `${domain} is attached — ${attached.error}.`
        : `Routing enforced: ${domain} serves the site, www.${domain} redirects to it. If your browser cached the old redirect, test in an incognito window.`
      : `Attach failed: ${attached.error}`,
    attached.ok ? undefined : "error",
  );
}

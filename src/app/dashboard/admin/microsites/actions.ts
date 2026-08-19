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
  type MicrositeConfig,
  type MicrositeContent,
} from "@/lib/microsites";
import {
  vercelDomainsConfigured,
  checkDomain,
  buyDomain,
  attachDomainToProject,
} from "@/lib/vercel-domains";
import { pingIndexNowForHost } from "@/lib/indexnow";
import { cleanBrandInput } from "@/lib/microsite-brand";

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

  // Going live: best-effort auto-attach the domain to the Vercel project so
  // the only manual step left is buying the domain.
  let attachNote = " (attach it to the Vercel project if you haven't).";
  if (status === "live" && domain && vercelDomainsConfigured()) {
    const attached = await attachDomainToProject(domain);
    attachNote = attached.ok
      ? " and the domain is attached to the Vercel project."
      : ` (auto-attach failed: ${attached.error}; attach it in Vercel manually).`;
  }
  // Tell IndexNow-fed engines (Bing and friends) the moment it's live;
  // Google discovers via the per-domain sitemap + GSC.
  if (status === "live" && domain) {
    await pingIndexNowForHost(domain, livePaths(content));
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    status === "live"
      ? `Live — the domain now serves the page${attachNote}`
      : `Moved to ${status}.`,
  );
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

  // The editor covers the home page copy; keep the generated sub-pages
  // intact. Brand: an explicit null clears it (Reset to defaults), a valid
  // override wins, anything malformed falls back to what was stored.
  const { data: existing } = await supabase
    .from("microsite_configs")
    .select("content")
    .eq("id", id)
    .maybeSingle();
  const prev = existing?.content as MicrositeContent | null;
  if (prev?.pages) clean.pages = prev.pages;
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
  const bought = await buyDomain(domain, check.price);
  if (!bought.ok) {
    redirectWithFlash(`${LIST}/${id}`, `Purchase failed: ${bought.error}`, "error");
  }
  const attached = await attachDomainToProject(domain);
  revalidatePath(`${LIST}/${id}`);
  redirectWithFlash(
    `${LIST}/${id}`,
    attached.ok
      ? `Bought ${domain} (US$${check.price}) and attached it to the Vercel project.`
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
      ? `${domain} is attached to the Vercel project.`
      : `Attach failed: ${attached.error}`,
    attached.ok ? undefined : "error",
  );
}

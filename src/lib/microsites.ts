import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicProject } from "@/lib/types";

/**
 * Microsite rail — standalone single-project lead-gen landing sites served
 * from THIS app on their own domains (proxy rewrites foreign hosts to
 * /sites/[domain]). Same repo, same Supabase: content reads the live public
 * views, leads write into project_leads. The SEO contract:
 *
 *   - a microsite renders ONLY when its config is `live`; unknown or draft
 *     domains get a noindex holding page (never liqwd.ca content — the
 *     duplicate-content guard);
 *   - generated copy must be UNIQUE vs the liqwd.ca project page;
 *   - every page carries the independent-site disclosure (passing-off +
 *     builder-relations guard).
 *
 * Copy system (v2, modeled on the proven VIP-registration landing format):
 * each section comes from a predefined library with its OWN prompt, written
 * by the strongest available writing model, in plain grade 6-8 English.
 * Em/en dashes are banned in output and additionally stripped in code.
 */

/** The strongest writing model available — microsites are the storefront. */
const MICROSITE_MODEL = "claude-opus-5";

export interface MicrositeSection {
  key?: string;
  title: string;
  body_md: string;
}

export interface MicrositeContent {
  headline: string;
  subhead: string;
  intro_md: string;
  sections: MicrositeSection[];
  faq: { question: string; answer: string }[];
  cta_label: string;
  generated_at: string;
  /** Admin overrides — survive regeneration; fall back to the template/subhead. */
  seo_title?: string | null;
  seo_description?: string | null;
  edited_at?: string | null;
}

export interface MicrositeConfig {
  id: string;
  domain: string;
  project_id: string;
  skin: string;
  status: "draft" | "live" | "retired";
  context: Record<string, unknown>;
  content: MicrositeContent | null;
  capture_key: string;
}

/** Lowercase bare domain, or null when it doesn't look like one. */
export function normalizeDomain(raw: string): string | null {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .slice(0, 253);
  return /^[a-z0-9][a-z0-9.-]{2,}\.[a-z]{2,}$/.test(d) ? d : null;
}

/**
 * Detects a founder microsite directive in a forwarded intake email —
 * "microsite: echotownswaterdown.com", "microsite for x.ca", or a bare
 * "[microsite]" tag. `domainInSubject` marks the only form trusted enough to
 * trigger a domain PURCHASE (the founder controls the subject when
 * forwarding; body text can contain a marketer's stray copy).
 */
export function parseMicrositeDirective(
  subject: string | null,
  text: string | null,
): { requested: boolean; domain: string | null; domainInSubject: boolean } {
  const find = (s: string | null) =>
    s?.match(/microsite(?:\s*(?:for|:|=))?\s+((?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,})/i) ??
    null;
  const inSubject = find(subject);
  const inText = find(text);
  const hit = inSubject ?? inText;
  if (hit) {
    return {
      requested: true,
      domain: normalizeDomain(hit[1]),
      domainInSubject: Boolean(inSubject),
    };
  }
  const tagged = /\[microsite\]|\bmicrosite\b/i.test(
    `${subject ?? ""}\n${text ?? ""}`,
  );
  return { requested: tagged, domain: null, domainInSubject: false };
}

/** Brandable domain candidates for a project — shown in the intake ping. */
export function suggestDomains(name: string, city?: string | null): string[] {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 40);
  const n = slug(name);
  if (!n) return [];
  const c = city ? slug(city) : "";
  const out = [`${n}.com`, `${n}.ca`];
  if (c && !n.includes(c)) out.push(`${n}${c}.com`);
  return out;
}

/** Hosts that belong to the primary app — everything else is a microsite. */
export function isPrimaryHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "liqwd.ca" ||
    h === "www.liqwd.ca" ||
    h.endsWith(".vercel.app") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export async function getMicrositeByDomain(
  domain: string,
): Promise<MicrositeConfig | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("microsite_configs")
      .select("id, domain, project_id, skin, status, context, content, capture_key")
      .eq("domain", domain.toLowerCase().replace(/^www\./, ""))
      .maybeSingle();
    return (data as MicrositeConfig | null) ?? null;
  } catch {
    return null;
  }
}

export async function getMicrositeProject(
  projectId: string,
): Promise<PublicProject | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("public_projects_view")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    return (data as PublicProject | null) ?? null;
  } catch {
    return null;
  }
}

export interface MicrositeImage {
  url: string;
  alt_text: string | null;
}

/** Public renderings/photos for the project — the microsite's photography. */
export async function getMicrositeGallery(
  projectId: string,
): Promise<MicrositeImage[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("project_media")
      .select("url, alt_text, media_type")
      .eq("project_id", projectId)
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .limit(12);
    const rows =
      (data as { url: string; alt_text: string | null; media_type: string | null }[] | null) ??
      [];
    // Renderings and photos only — floor plans belong on the LIQWD listing.
    return rows
      .filter((r) => r.media_type !== "floorplan")
      .map((r) => ({ url: r.url, alt_text: r.alt_text }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Copy style enforcement
// ---------------------------------------------------------------------------

/**
 * Em/en dashes are banned sitewide (founder rule). Titles get " | ",
 * body copy gets ", ", numeric ranges become "X to Y".
 */
export function stripDashes(s: string, mode: "title" | "body"): string {
  return s
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, mode === "title" ? " | " : ", ")
    .replace(/ {2,}/g, " ")
    .trim();
}

const VOICE =
  "You write for a real estate landing page. Write like a real person helping a friend decide on a home. " +
  "Grade 6 to 8 reading level: short sentences, everyday words, active voice. Talk to the reader as 'you'. Contractions are fine. " +
  "NEVER use an em dash or en dash anywhere, in any field. Use a period, a comma, or the word 'and' instead. In headings use ' | ' as a divider only if you truly need one. " +
  "Banned words and phrases: stunning, luxurious, luxury living, nestled, boasts, unparalleled, seamless, vibrant, prestigious, exquisite, look no further, dream home. No exclamation marks. No hype. " +
  "Facts about THIS PROJECT come ONLY from the fact block. If a project detail is not released yet, say so in plain words, like 'The builder has not released this yet.' " +
  "You MAY use general knowledge about the city and region (real highways, transit lines, landmarks, how the area feels) when you are sure it is true. Never invent project details, prices, dates, sizes, or incentives. " +
  "Never present the page as the builder's official site. Markdown allowed in body fields: short paragraphs, bold for key numbers, lists where they help.";

// ---------------------------------------------------------------------------
// Section library — every section has its own prompt (founder rule)
// ---------------------------------------------------------------------------

interface SectionDef {
  key: string;
  /** Shown in the admin picker. */
  label: string;
  /** The section's custom prompt. */
  brief: string;
  /** Included by default? (context is the serialized questionnaire, lowercase) */
  auto: (p: PublicProject, ctx: string) => boolean;
}

export const MICROSITE_SECTIONS: { key: string; label: string }[] = [
  { key: "overview", label: "About the project" },
  { key: "pricing_value", label: "Pricing story" },
  { key: "homes_floorplans", label: "Homes & floor plans" },
  { key: "top_reasons", label: "Top 5 reasons" },
  { key: "location_neighbourhood", label: "Neighbourhood" },
  { key: "connectivity", label: "Getting around" },
  { key: "lifestyle_amenities", label: "Nearby amenities" },
  { key: "deposit_incentives", label: "Deposit & incentives" },
  { key: "investment", label: "Investor angle" },
  { key: "builder", label: "About the builder" },
  { key: "buying_process", label: "How pre-con buying works" },
  { key: "why_register", label: "Why register now" },
];

const SECTION_DEFS: SectionDef[] = [
  {
    key: "overview",
    label: "About the project",
    brief:
      "Write the 'About' section. Say what is being built, the home types, who the builder is, and where it sits. Then give a short bullet list of quick facts the reader can scan: starting price, home types, bedroom mix, status, and location. Only include facts that exist in the fact block.",
    auto: () => true,
  },
  {
    key: "pricing_value",
    label: "Pricing story",
    brief:
      "Write the pricing section. Explain what the starting price means in plain terms and who that price point actually works for (compare it to what people pay in rent or for resale in the region only if you are sure). Be clear about what pricing is not released yet. End with one line: registering gets the full price list first.",
    auto: () => true,
  },
  {
    key: "homes_floorplans",
    label: "Homes & floor plans",
    brief:
      "Write the homes section. Walk through the bedroom mix and who each layout suits (first buyer, couple, young family, investor). If the home type has a name people may not know (like a stacked townhome), explain what it is in one or two plain sentences. Say when floor plans come out if known, otherwise say registrants see them first.",
    auto: () => true,
  },
  {
    key: "top_reasons",
    label: "Top 5 reasons",
    brief:
      "Write a 'Top 5 reasons to look at this project' section as a numbered list. Each reason is one bold short phrase plus one or two plain sentences. Ground every reason in the fact block or solid general knowledge of the area. No filler reasons.",
    auto: () => true,
  },
  {
    key: "location_neighbourhood",
    label: "Neighbourhood",
    brief:
      "Write the neighbourhood section. Describe what daily life looks like in this specific community and city: the feel of the area, who lives there, what is close by. Use real general knowledge of the place. If the positioning context gives local nuggets, use them, they are gold.",
    auto: (p) => Boolean(p.city),
  },
  {
    key: "connectivity",
    label: "Getting around",
    brief:
      "Write the getting-around section. Cover real commute anchors for this location: named highways, GO or transit options, and roughly where you can get to and how. Only name roads and transit you are sure exist. Keep it useful for someone deciding if they could live there.",
    auto: (p) => Boolean(p.city),
  },
  {
    key: "lifestyle_amenities",
    label: "Nearby amenities",
    brief:
      "Write the nearby-amenities section: schools, parks, trails, shopping, recreation. Lead with anything the positioning context names. General knowledge about the city is fine when you are sure. If you have little to work with, keep this short and honest rather than padding it.",
    auto: (_p, ctx) => /amenit|park|trail|school|shop|rec |recreation|grocer/.test(ctx),
  },
  {
    key: "deposit_incentives",
    label: "Deposit & incentives",
    brief:
      "Write the deposit and incentives section using ONLY what the positioning context provides (deposit structure, credits, caps, promotions). Lay it out simply, a list works well. Add one line that incentives change and the sales team confirms the current ones.",
    auto: (_p, ctx) => /deposit|incentive|credit|cap|promo/.test(ctx),
  },
  {
    key: "investment",
    label: "Investor angle",
    brief:
      "Write the investor section. Talk about why an investor might look at this project and price point: entry cost, tenant appeal of the home type and area. Never promise returns or appreciation. Close with one line telling the reader to talk to their own advisor.",
    auto: (_p, ctx) => /invest/.test(ctx),
  },
  {
    key: "builder",
    label: "About the builder",
    brief:
      "Write a short section about the builder. Name them and say only what you are sure of. If you know little about this builder, keep it to two or three sentences and add one practical line: in Ontario, buyers can look up any builder's history on the Tarion and HCRA public registries before they buy.",
    auto: (p) => Boolean(p.builder_name),
  },
  {
    key: "buying_process",
    label: "How pre-con buying works",
    brief:
      "Write a plain-English explainer: how buying a pre-construction home in Ontario works. Cover the usual steps: register, get the price list, pick a unit at launch, deposits paid in stages over time, a lawyer reviews the agreement, then you wait for construction and closing. Keep it general and true for pre-construction; do not state legal specifics you are not sure apply to this exact project type.",
    auto: () => true,
  },
  {
    key: "why_register",
    label: "Why register now",
    brief:
      "Write the why-register section. Explain concretely what early registrants get: the price list and floor plans first, first pick of units at launch, and launch-day details before the public. No pressure tactics, just the real advantage of being early.",
    auto: () => true,
  },
];

const HERO_BRIEF =
  "Write the hero for this landing page. headline: led by the project name, under 65 characters, include the city or the starting price if it fits naturally. subhead: one sentence with the single strongest hook for this buyer audience. cta_label: 3 to 5 words for the lead form button, like 'Get the price list'.";

const INTRO_BRIEF =
  "Write the page intro: two short paragraphs. First, what this project is, where it is, and the one thing that makes it worth a serious look (use the positioning hook if given). Second, tell the reader this page has the full rundown and that the form gets them pricing and floor plans as they come out.";

const FAQ_BRIEF =
  "Write 6 to 8 FAQ entries matching what real buyers type into Google about a project like this: how much it costs, where it is, when it launches, who the builder is, what home types there are, how deposits work, and whether it suits first-time buyers or investors. Answers are 1 to 3 sentences, factual, plain. If a detail is not released, the answer says so.";

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function factBlock(p: PublicProject): string {
  return [
    `Project: ${p.project_name}`,
    `Builder: ${p.builder_name ?? "to be confirmed"}`,
    `Location: ${[p.neighbourhood, p.city, p.province].filter(Boolean).join(", ")}`,
    `Type: ${p.project_type?.replace(/_/g, " ") ?? "unpublished"} · Status: ${p.sales_status?.replace(/_/g, " ") ?? "unpublished"}`,
    `Pricing: ${p.price_from_public ? `from $${Math.round(p.price_from_public).toLocaleString("en-CA")}` : "not yet released"}`,
    `Beds: ${p.bedrooms_summary ?? "unpublished"} · Storeys: ${p.storeys ?? "unpublished"} · Units: ${p.total_units ?? "unpublished"}`,
    `Occupancy: ${p.occupancy_estimate_text ?? "unpublished"}`,
    p.address_full ? `Address: ${p.address_full}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callTool(
  client: Anthropic,
  tool: Anthropic.Messages.Tool,
  user: string,
  maxTokens: number,
): Promise<Record<string, unknown> | null> {
  try {
    const message = await client.messages.create({
      model: MICROSITE_MODEL,
      max_tokens: maxTokens,
      system: VOICE,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: user }],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    return block && block.type === "tool_use"
      ? (block.input as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

const T_HERO: Anthropic.Messages.Tool = {
  name: "emit_hero",
  description: "Return the hero copy. Call exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: { type: "string" },
      subhead: { type: "string" },
      cta_label: { type: "string" },
    },
    required: ["headline", "subhead", "cta_label"],
  },
};

const T_SECTION: Anthropic.Messages.Tool = {
  name: "emit_section",
  description: "Return the finished section. Call exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Section heading, short, no dashes" },
      body_md: { type: "string", description: "Section body, markdown" },
    },
    required: ["title", "body_md"],
  },
};

const T_FAQ: Anthropic.Messages.Tool = {
  name: "emit_faq",
  description: "Return the FAQ list. Call exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      faq: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["faq"],
  },
};

/** The sections a config generates: explicit picks, else facts-driven defaults. */
export function resolveSectionKeys(
  config: MicrositeConfig,
  project: PublicProject,
): string[] {
  const picked = Array.isArray(config.context?.sections)
    ? (config.context.sections as unknown[]).filter(
        (k): k is string =>
          typeof k === "string" && SECTION_DEFS.some((d) => d.key === k),
      )
    : [];
  if (picked.length) return picked;
  const ctx = JSON.stringify(config.context ?? {}).toLowerCase();
  return SECTION_DEFS.filter((d) => d.auto(project, ctx)).map((d) => d.key);
}

/**
 * Generates the full page: hero + intro + one call PER SECTION (each with its
 * own prompt) + FAQ, all in parallel on the strongest writing model. Returns
 * null when the core pieces fail; never throws. Human reviews before live.
 */
export async function generateMicrositeContent(
  config: MicrositeConfig,
  project: PublicProject,
): Promise<MicrositeContent | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();
  const keys = resolveSectionKeys(config, project);
  const defs = SECTION_DEFS.filter((d) => keys.includes(d.key));
  const ctx = JSON.stringify(config.context ?? {}, null, 2);
  const base =
    `FACT BLOCK (the only source of project facts):\n${factBlock(project)}\n\n` +
    `POSITIONING CONTEXT (founder questionnaire, may be sparse; steer emphasis with it):\n${ctx}\n\n`;

  const [hero, intro, faq, ...sections] = await Promise.all([
    callTool(client, T_HERO, `${base}${HERO_BRIEF}`, 400),
    callTool(client, T_SECTION, `${base}${INTRO_BRIEF}\nUse title "Intro" (it is not shown).`, 800),
    callTool(client, T_FAQ, `${base}${FAQ_BRIEF}`, 1800),
    ...defs.map((d) =>
      callTool(
        client,
        T_SECTION,
        `${base}SECTION BRIEF:\n${d.brief}`,
        1200,
      ),
    ),
  ]);

  if (!hero || typeof hero.headline !== "string" || !intro) return null;

  const builtSections: MicrositeSection[] = [];
  defs.forEach((d, i) => {
    const s = sections[i];
    if (s && typeof s.title === "string" && typeof s.body_md === "string") {
      builtSections.push({
        key: d.key,
        title: stripDashes(String(s.title), "title"),
        body_md: stripDashes(String(s.body_md), "body"),
      });
    }
  });
  if (builtSections.length < 3) return null;

  return {
    headline: stripDashes(String(hero.headline), "title"),
    subhead: stripDashes(String(hero.subhead ?? ""), "body"),
    intro_md: stripDashes(String(intro.body_md ?? ""), "body"),
    sections: builtSections,
    faq: (Array.isArray(faq?.faq)
      ? (faq.faq as { question: string; answer: string }[]).slice(0, 8)
      : []
    ).map((f) => ({
      question: stripDashes(String(f.question), "title"),
      answer: stripDashes(String(f.answer), "body"),
    })),
    cta_label: stripDashes(String(hero.cta_label ?? "Get the price list"), "title"),
    generated_at: new Date().toISOString(),
  };
}

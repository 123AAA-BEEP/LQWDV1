import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLinkContext } from "@/lib/email-intake/fetch-links";
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

export interface MicrositeSubPage {
  heading: string;
  seo_title: string;
  meta_description: string;
  intro_md: string;
  sections: MicrositeSection[];
  faq: { question: string; answer: string }[];
}

export type MicrositeSubPageKey =
  | "floor_plans"
  | "pricing"
  | "neighbourhood"
  | "site_plan";

export {
  BRAND_FONTS,
  BRAND_HEX,
  cleanBrandInput,
  type MicrositeBrand,
} from "./microsite-brand";
import {
  BRAND_FONTS,
  cleanBrandInput,
  type MicrositeBrand,
} from "./microsite-brand";

export interface MicrositeContent {
  headline: string;
  subhead: string;
  intro_md: string;
  sections: MicrositeSection[];
  faq: { question: string; answer: string }[];
  cta_label: string;
  generated_at: string;
  /** Sub-pages (/floor-plans, /pricing, /neighbourhood) — the organic-sitelink depth. */
  pages?: Partial<Record<MicrositeSubPageKey, MicrositeSubPage>>;
  /** Extracted visual identity; renderer falls back to defaults when absent. */
  brand?: MicrositeBrand | null;
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
  /** Lead automation (migration 0091) — optional so slim selects still cast. */
  auto_send_details?: boolean;
  details_url?: string | null;
  /** Developer logo (migration 0093) shown in About the developer. */
  builder_logo_url?: string | null;
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
      .select(
        "id, domain, project_id, skin, status, context, content, capture_key, auto_send_details, details_url, builder_logo_url",
      )
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
// Stock image library — themed fallback photography for thin-media projects
// ---------------------------------------------------------------------------

export const STOCK_THEMES = [
  "hero",
  "neighbourhood",
  "transit",
  "amenities",
  "parks",
  "homes",
  "lifestyle",
  "generic",
] as const;
export type StockTheme = (typeof STOCK_THEMES)[number];

export interface StockImage {
  id: string;
  theme: StockTheme;
  url: string;
  alt_text: string | null;
  city: string | null;
}

/** Which stock theme fills a section's image slot when no rendering is left. */
export const SECTION_STOCK_THEME: Record<string, StockTheme> = {
  overview: "homes",
  location_neighbourhood: "neighbourhood",
  connectivity: "transit",
  lifestyle_amenities: "amenities",
  builder: "homes",
  pricing_value: "homes",
  homes_floorplans: "lifestyle",
  top_reasons: "parks",
  deposit_incentives: "generic",
  investment: "generic",
  buying_process: "generic",
  why_register: "lifestyle",
};

export async function getMicrositeStock(): Promise<StockImage[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("microsite_stock_images")
      .select("id, theme, url, alt_text, city")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return (data as StockImage[] | null) ?? [];
  } catch {
    return [];
  }
}

const strHash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * Deterministic themed pick: same domain always gets the same images (no
 * layout shift between crawls), different domains get different ones (so the
 * network doesn't share one obvious footprint). City-tagged images beat
 * generic when they match; `used` prevents repeats within a page.
 */
export function pickStock(
  stock: StockImage[],
  theme: StockTheme,
  city: string | null,
  seed: string,
  used: Set<string>,
): StockImage | null {
  const pool = stock.filter((s) => s.theme === theme && !used.has(s.id));
  if (!pool.length) return null;
  const local = city
    ? pool.filter((s) => s.city && s.city.toLowerCase() === city.toLowerCase())
    : [];
  const candidates = local.length ? local : pool.filter((s) => !s.city);
  const finalPool = candidates.length ? candidates : pool;
  const pick = finalPool[strHash(`${seed}|${theme}|${used.size}`) % finalPool.length];
  used.add(pick.id);
  return pick;
}

// ---------------------------------------------------------------------------
// Copy style enforcement
// ---------------------------------------------------------------------------

/**
 * Em/en dashes are banned sitewide (founder rule). Titles get " | ",
 * body copy gets ", ", numeric ranges become "X to Y". Markdown bold is
 * banned too (reads like machine copy) — doubled asterisks/underscores are
 * stripped; single asterisks stay so list syntax survives.
 */
export function stripDashes(s: string, mode: "title" | "body"): string {
  return s
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[—–]\s*/g, mode === "title" ? " | " : ", ")
    .replace(/\*\*|__/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

const VOICE =
  "You write for a real estate landing page. Write like a real person helping a friend decide on a home. " +
  "Grade 6 to 8 reading level: short sentences, everyday words, active voice. Talk to the reader as 'you'. Contractions are fine. " +
  "NEVER use an em dash or en dash anywhere, in any field. Use a period, a comma, or the word 'and' instead. In headings use ' | ' as a divider only if you truly need one. " +
  "Banned words and phrases: stunning, luxurious, luxury living, nestled, boasts, unparalleled, seamless, vibrant, prestigious, exquisite, look no further, dream home, priced out. No exclamation marks. No hype. " +
  "Frame affordability POSITIVELY: buyers are getting more for their money, making a smart first move, finding real value close to the city. Never describe the reader or anyone as priced out, struggling, squeezed, or shut out of the market. " +
  "NEVER narrate your own writing process or knowledge on the page. Never write things like 'that is the one fact we can confirm', 'we will not pad this out', 'claims we cannot back up', or 'check it yourself'. The page speaks with quiet authority: say what is known plainly, and simply OMIT what is unknown without commenting on the omission. " +
  "Never use markdown bold or italics (no ** or _). Numbers and names carry their own weight in plain sentences. Bullet lists are fine where they genuinely help. " +
  "Facts about THIS PROJECT come ONLY from the fact block. If a project detail is not released yet, say so in plain words, like 'The builder has not released this yet.' " +
  "You MAY use general knowledge about the city and region (real highways, transit lines, landmarks, how the area feels) when you are sure it is true. Never invent project details, prices, dates, sizes, or incentives. " +
  "Never present the page as the builder's official site. " +
  "SECTION SHAPE (landing-page proportion): open with one short paragraph of 2 to 3 sentences, then 2 to 4 bullet points, each starting with a 2 to 4 word lead-in and a colon, like 'Deposit timing: paid in stages over months, not all at once.' Keep each section body between roughly 60 and 110 words. Page intros and FAQ answers are exempt from the bullet shape.";

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

/**
 * Canonical order (founder rule): the page EDUCATES first, sells second.
 * Sections 1-5 are the educational block (project, neighbourhood, getting
 * around, amenities, developer); the sales/commercial sections follow.
 */
export const MICROSITE_SECTIONS: { key: string; label: string }[] = [
  { key: "overview", label: "About the project" },
  { key: "location_neighbourhood", label: "Neighbourhood" },
  { key: "connectivity", label: "Getting around" },
  { key: "lifestyle_amenities", label: "Nearby amenities" },
  { key: "builder", label: "About the developer" },
  { key: "pricing_value", label: "Pricing story" },
  { key: "homes_floorplans", label: "Homes & floor plans" },
  { key: "top_reasons", label: "Top 5 reasons" },
  { key: "deposit_incentives", label: "Deposit & incentives" },
  { key: "investment", label: "Investor angle" },
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
    auto: () => true,
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
    label: "About the developer",
    brief:
      "Write the developer profile. Use the SOURCE MATERIAL block (the builder's own copy or website text) plus solid general knowledge to write an authoritative short profile: who they are, what they build, where they build, and how they approach their communities. Weave it into OUR voice, never copy their marketing lines verbatim and never adopt their hype. If material is thin, write a confident two or three sentences about what the builder is delivering here and close with one useful line, like: buyers can review any Ontario builder's history on the Tarion and HCRA public registries. Never comment on how much or little information you have.",
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

/**
 * Sub-page registry: slug on the domain, admin label, custom page prompt.
 * Slugs and title wording are calibrated against the founder's real GSC
 * data from a past project microsite: every top query was branded, and the
 * modifiers that ranked were "homes", "site plan", "prices" (in that
 * order) — so those exact words anchor the pages.
 */
export const MICROSITE_SUBPAGES: {
  key: MicrositeSubPageKey;
  slug: string;
  label: string;
  brief: string;
}[] = [
  {
    key: "floor_plans",
    slug: "floor-plans",
    label: "Floor plans",
    brief:
      "Write the /floor-plans page. HARD RULE: floor plans are gate-kept. Never describe specific layouts, square footage, or per-plan pricing, even if you could guess. This page is a text PREVIEW: what home types and bedroom mixes are coming (from the fact block), who each general layout suits, what the home type is like to live in, and when plans typically come out for a project at this stage. Every part of the page steers to one action: register to get the floor plans the moment any are available. heading: like 'PROJECT floor plans'. seo_title: like 'PROJECT Floor Plans | 1 and 3 Bedroom Stacked Towns in CITY'.",
  },
  {
    key: "site_plan",
    slug: "site-plan",
    label: "Site plan",
    brief:
      "Write the /site-plan page. HARD RULE: the site plan is gate-kept and may not even be released. Never invent lot counts, block layouts, phasing, or orientations. Explain in plain words what a site plan shows for a community like this (where homes sit, green space, parking, visitor access), why buyers use it (picking a lot or unit position early), and its release status from the fact block. The one action: register to get the site plan the moment it's available. Use the words 'site plan' naturally throughout. heading: like 'PROJECT site plan'. seo_title: like 'PROJECT Site Plan | Lots, Layout and Phasing in CITY'.",
  },
  {
    key: "pricing",
    slug: "pricing",
    label: "Prices",
    brief:
      "Write the /pricing page. Go deep on the price story: what the starting price means, what it buys in this market, how pre-construction prices typically move from first release to later releases, and what is not released yet. Use the word 'prices' naturally (that is what buyers type), alongside 'price list'. Use deposit or incentive details ONLY if the positioning context provides them. Full price lists are gate-kept: the page's one action is registering to get the price list first. heading: like 'PROJECT prices'. seo_title: like 'PROJECT Prices and Price List | From $X in CITY'.",
  },
  {
    key: "neighbourhood",
    slug: "neighbourhood",
    label: "Neighbourhood",
    brief:
      "Write the /neighbourhood page: a genuinely useful area guide for someone deciding whether they could live here. The community's feel, who lives there, commuting (real named highways and transit), schools and parks and shopping, what a normal week looks like. Use real general knowledge of the place plus any local nuggets in the positioning context. Work in the inverted phrasing 'CITY's PROJECT' or 'the PROJECT community in CITY' naturally once or twice, since people search the name both ways. heading: like 'Living in CITY | around PROJECT'. seo_title: like 'PROJECT Location | Living in CITY'.",
  },
];

const HERO_BRIEF =
  "Write the hero for this landing page. headline: led by the project name, under 65 characters, include the city or the starting price if it fits naturally. subhead: one sentence with the single strongest hook for this buyer audience. cta_label: 3 to 5 words for the lead form button, like 'Get the price list'.";

const INTRO_BRIEF =
  "Write the page intro: two short paragraphs. First, what this project is, where it is, and the one thing that makes it worth a serious look (use the positioning hook if given). Second, tell the reader this page has the full rundown and that the form gets them pricing and floor plans as they come out.";

const FAQ_BRIEF =
  "Write 6 to 8 FAQ entries matching what real buyers type into Google about a project like this: how much homes cost (use the word 'prices'), where it is, when it launches, who the builder is, what home types there are, whether the site plan and floor plans are out yet, how deposits work, and whether it suits first-time buyers or investors. Answers are 1 to 3 sentences, factual, plain. If a detail is not released, the answer says so.";

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

const T_PAGE: Anthropic.Messages.Tool = {
  name: "emit_page",
  description: "Return the finished sub-page. Call exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      heading: { type: "string", description: "The page H1, no dashes" },
      seo_title: { type: "string", description: "Browser/Google title, under 65 chars" },
      meta_description: { type: "string", description: "Google snippet, under 160 chars" },
      intro_md: { type: "string", description: "1-2 opening paragraphs, markdown" },
      sections: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body_md: { type: "string" },
          },
          required: ["title", "body_md"],
        },
        description: "2-4 sections",
      },
      faq: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
        description: "0-4 page-specific FAQ entries (do not repeat the home page's)",
      },
    },
    required: ["heading", "seo_title", "meta_description", "intro_md", "sections", "faq"],
  },
};

const T_BRAND: Anthropic.Messages.Tool = {
  name: "emit_brand",
  description: "Return the visual identity read from the marketing imagery. Call exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      primary_hex: {
        type: "string",
        description:
          "Main CTA/button colour drawn from the imagery's palette. Dark or saturated enough to carry WHITE text. 6-digit hex like #1f3a2e.",
      },
      accent_hex: {
        type: "string",
        description: "Secondary accent from the palette. 6-digit hex.",
      },
      heading_font: {
        type: "string",
        enum: [...BRAND_FONTS],
        description: "The Google font that best matches the marketing's typography vibe.",
      },
      font_stack: { type: "string", enum: ["serif", "sans-serif"] },
    },
    required: ["primary_hex", "accent_hex", "heading_font", "font_stack"],
  },
};

const cleanBrand = (raw: Record<string, unknown> | null): MicrositeBrand | null =>
  raw ? cleanBrandInput(raw) : null;

type VisionImage = {
  type: "image";
  source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string };
};

const VISION_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Pulls a public rendering into a vision block; null on any trouble. */
async function fetchVisionImage(url: string): Promise<VisionImage | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const mt = (res.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .replace("image/jpg", "image/jpeg");
    if (!VISION_TYPES.includes(mt)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 8 * 1024 * 1024) return null;
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mt as VisionImage["source"]["media_type"],
        data: buf.toString("base64"),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Reads the palette + typography vibe off the project's own renderings so
 * the microsite dresses like the builder's marketing, not like LIQWD.
 * Null (no imagery, fetch failure, bad output) = renderer defaults.
 */
async function extractBrand(
  client: Anthropic,
  project: PublicProject,
): Promise<MicrositeBrand | null> {
  const urls = [project.hero_image_url].filter((u): u is string => Boolean(u));
  if (!urls.length) return null;
  const images = (await Promise.all(urls.map(fetchVisionImage))).filter(
    (i): i is VisionImage => i !== null,
  );
  if (!images.length) return null;
  try {
    const message = await client.messages.create({
      model: MICROSITE_MODEL,
      max_tokens: 300,
      tools: [T_BRAND],
      tool_choice: { type: "tool", name: "emit_brand" },
      messages: [
        {
          role: "user",
          content: [
            ...images,
            {
              type: "text",
              text: "This is the marketing rendering for a new-construction project. Extract a landing-page identity that mimics it: a primary colour for buttons (from the imagery, dark/saturated enough for white text), a secondary accent, and the closest-matching font. Call emit_brand exactly once.",
            },
          ],
        },
      ],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    return block && block.type === "tool_use"
      ? cleanBrand(block.input as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function cleanSubPage(raw: Record<string, unknown> | null): MicrositeSubPage | null {
  if (!raw || typeof raw.heading !== "string" || typeof raw.intro_md !== "string") {
    return null;
  }
  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .filter(
      (s): s is { title: string; body_md: string } =>
        typeof (s as { title?: unknown })?.title === "string" &&
        typeof (s as { body_md?: unknown })?.body_md === "string",
    )
    .slice(0, 4)
    .map((s) => ({
      title: stripDashes(s.title, "title"),
      body_md: stripDashes(s.body_md, "body"),
    }));
  if (!sections.length) return null;
  return {
    heading: stripDashes(String(raw.heading), "title"),
    seo_title: stripDashes(String(raw.seo_title ?? raw.heading), "title"),
    meta_description: stripDashes(String(raw.meta_description ?? ""), "body"),
    intro_md: stripDashes(String(raw.intro_md), "body"),
    sections,
    faq: (Array.isArray(raw.faq) ? raw.faq : [])
      .filter(
        (f): f is { question: string; answer: string } =>
          typeof (f as { question?: unknown })?.question === "string" &&
          typeof (f as { answer?: unknown })?.answer === "string",
      )
      .slice(0, 4)
      .map((f) => ({
        question: stripDashes(f.question, "title"),
        answer: stripDashes(f.answer, "body"),
      })),
  };
}

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
  // Page order always follows the canonical educate-first sequence,
  // regardless of pick order (the admin can still hand-reorder afterwards).
  const orderOf = (k: string) => MICROSITE_SECTIONS.findIndex((s) => s.key === k);
  const defs = SECTION_DEFS.filter((d) => keys.includes(d.key)).sort(
    (a, b) => orderOf(a.key) - orderOf(b.key),
  );
  const ctx = JSON.stringify(config.context ?? {}, null, 2);

  // Standing practice: the context should always carry builder copy or a
  // builder/sales URL. Any URL in the context gets fetched and fed to every
  // writing call as SOURCE MATERIAL, so sections (the developer profile
  // especially) weave real researched substance instead of hedging.
  let sourceMaterial = "";
  try {
    const urls = [...new Set(ctx.match(/https?:\/\/[^\s"'\\)]+/g) ?? [])].slice(0, 2);
    if (urls.length) {
      const fetched = await fetchLinkContext(urls);
      sourceMaterial = fetched.pages
        .map((p) => `--- FROM ${p.url} ---\n${p.text.slice(0, 5000)}`)
        .join("\n\n")
        .slice(0, 9000);
    }
  } catch {
    /* generation proceeds without source material */
  }

  const base =
    `FACT BLOCK (the only source of project facts):\n${factBlock(project)}\n\n` +
    `POSITIONING CONTEXT (founder questionnaire, may be sparse; steer emphasis with it):\n${ctx}\n\n` +
    (sourceMaterial
      ? `SOURCE MATERIAL (builder/sales pages the founder supplied; weave into our voice, never copy verbatim, never adopt their hype):\n${sourceMaterial}\n\n`
      : "");

  const [brand, copy] = await Promise.all([
    extractBrand(client, project),
    Promise.all([
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
      ...MICROSITE_SUBPAGES.map((p) =>
        callTool(
          client,
          T_PAGE,
          `${base}This is a SUB-PAGE of the project's landing site (the home page covers the overview). PAGE BRIEF:\n${p.brief}`,
          2000,
        ),
      ),
    ]),
  ]);
  const [hero, intro, faq, ...rest] = copy;
  const sections = rest.slice(0, defs.length);
  const subpageRaw = rest.slice(defs.length);

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

  const pages: Partial<Record<MicrositeSubPageKey, MicrositeSubPage>> = {};
  MICROSITE_SUBPAGES.forEach((p, i) => {
    const page = cleanSubPage(subpageRaw[i]);
    if (page) pages[p.key] = page;
  });

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
    ...(Object.keys(pages).length ? { pages } : {}),
    brand,
  };
}

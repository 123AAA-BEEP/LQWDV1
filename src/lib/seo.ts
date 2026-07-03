import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface SeoFieldsValue {
  seo_title: string;
  seo_meta_description: string;
  page_summary: string;
  page_description: string;
  section_intro: string;
  section_amenities: string;
  section_getting_around: string;
  section_developer: string;
  /** 5–8 Q&As rendered on-page + emitted as schema.org FAQPage. Optional so
   *  the admin editor's text-field form keeps compiling untouched. */
  section_faq?: { question: string; answer: string }[];
  /** "Buying pre-construction here" educational block (process, not promises). */
  section_buying?: string;
}

const PROJECT_SELECT =
  "project_name, builder_name, city, municipality, neighbourhood, province, address_full, intersection_primary, intersection_secondary, latitude, longitude, project_type, sales_status, construction_status, ownership_type, price_from_public, price_to_public, price_currency, occupancy_estimate_text, total_units, storeys, bedrooms_summary, size_range_sqft_min, size_range_sqft_max, description_short, description_long, listing_type, price_period";

const SYSTEM =
  "You are an expert SEO copywriter for a Canadian new-home / pre-construction real estate marketing site. " +
  "Write accurate, public-safe copy using the supplied project facts, a supplied list of REAL nearby places (hospitals, shopping, schools, post-secondary, transit, groceries, parks, and points of interest, each with a distance), and well-known, stable facts about the city/neighbourhood such as the major highways and GO/transit lines that serve the area. " +
  "Never invent prices, dates, unit counts, awards, place names, schools, or distances that aren't in the supplied facts or the nearby-places list; you MAY name any place that appears in that list, and should prefer the closest, most notable ones. When you lack a specific, stay at the neighbourhood/area level. " +
  "Weave in the city/neighbourhood and builder naturally for local SEO. Vary your sentence openings — do NOT start multiple sections the same way, and do NOT lead every section with the project name or with 'Located in'. " +
  "Never name the websites or aggregators facts were sourced from, and never mention disagreements between sources — state the reconciled fact plainly. " +
  "RENTALS: when listing_type is 'for_rent', this is a purpose-built rental building — write for RENTERS. Prices are MONTHLY RENTS (say 'from $X/month', never a purchase price). Use leasing language (now leasing, move-in dates, suites), make section_buying about how leasing a new building works in Ontario (applications, what's typically included, lease terms, standard lease form) instead of buying pre-construction, and make the FAQ renter questions (rent range, move-in timing, pets/parking only if in facts, how to book a tour). " +
  "Write like a knowledgeable local journalist: concrete, human, specific. No hype clichés, no ALL CAPS, no emojis. Canadian spelling.";

// Baseline per-field guidance. Admin-configured instructions (from
// seo_prompt_settings) are appended to these at generation time.
const FIELD_DESCRIPTIONS = {
  seo_title: "Up to 60 characters. Include the project name and city.",
  seo_meta_description:
    "150–160 characters. Compelling and keyword-aware; one or two sentences.",
  page_summary: "One or two plain-language sentences for the page header.",
  page_description:
    "One or two short paragraphs of public-safe marketing copy about the project.",
  section_intro:
    "2–4 sentences (you may use two short paragraphs, separated by a blank line) introducing what the project is and where it's headed — the builder, home type, scale, and what stage it's at. Don't merely restate the title; give a sense of the place.",
  section_amenities:
    "A short paragraph (you may use two, blank-line separated) on local amenities and lifestyle. Draw on the supplied nearby-places list and name the most relevant REAL places, roughly in priority order — hospitals, shopping, schools and post-secondary, then groceries, parks, and notable points of interest — leading with what is genuinely close. Only name places that appear in the supplied facts or nearby-places list; never fabricate a business or school name or a distance.",
  section_getting_around:
    "A short paragraph on getting around. Name the REAL nearby transit from the supplied list (GO stations, subway/LRT stations, regional bus) and the major highways that genuinely serve this city/area. Use stable, well-known infrastructure; never invent route numbers, station names not in the list, or precise travel times.",
  section_developer:
    "A short, non-promotional paragraph about the builder — their focus and reputation in the GTA/Ontario. If the builder isn't well known, keep it general and factual; never fabricate awards, project counts, or years in business.",
  section_faq:
    "5 to 8 question-and-answer pairs a buyer or investor would actually search for about THIS project (e.g. starting price, home types, occupancy timing, location/transit, the builder, how to register). Answer strictly from the supplied facts; when a specific isn't in the facts (e.g. deposit structure), answer with accurate GENERAL Ontario pre-construction guidance and say details will be confirmed by the builder. Plain, direct answers of 2–4 sentences. Never invent prices, dates, or counts.",
  section_buying:
    "A short educational section (2–3 paragraphs, blank-line separated) titled toward 'buying pre-construction here': how the process typically works in Ontario — registering for first access, deposit structures being staged over time, the 10-day cooling-off period for new condos (only mention if this IS a condo), interim occupancy vs final closing, and why buying early in a release can matter. General, accurate, non-promissory education — no invented numbers, no financial advice, no guarantees of appreciation.",
} as const;

interface SeoPromptSettings {
  overall_instructions: string | null;
  seo_title_instructions: string | null;
  seo_meta_description_instructions: string | null;
  page_summary_instructions: string | null;
  page_description_instructions: string | null;
}

function describe(base: string, custom: string | null | undefined): string {
  const extra = (custom ?? "").trim();
  return extra ? `${base} Additional instruction: ${extra}` : base;
}

/**
 * Generates SEO metadata for a project using Claude Opus 4.8. Reads only
 * public-safe project fields (never the admin-only provenance). Returns null
 * if the API key is unset, the project is missing, or the request fails —
 * callers decide how to surface that. Must run in an admin context (the base
 * `projects` table is admin-only readable).
 */
export async function generateSeoFields(
  projectId: string,
  db?: SupabaseClient,
): Promise<SeoFieldsValue | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const supabase = db ?? (await createClient());
  const { data: project } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  // Real nearby places (OSM-sourced) so amenities / getting-around name actual
  // anchors instead of guessing — never fabricate beyond this list.
  const { data: page } = await supabase
    .from("public_project_pages")
    .select("neighbourhood_features")
    .eq("project_id", projectId)
    .maybeSingle();
  const nearby = page?.neighbourhood_features ?? null;

  const { data: settings } = await supabase
    .from("seo_prompt_settings")
    .select(
      "overall_instructions, seo_title_instructions, seo_meta_description_instructions, page_summary_instructions, page_description_instructions",
    )
    .eq("id", 1)
    .maybeSingle();
  const s = (settings ?? null) as SeoPromptSettings | null;

  const overall = (s?.overall_instructions ?? "").trim();
  const system = overall
    ? `${SYSTEM}\n\nHouse style / additional instructions:\n${overall}`
    : SYSTEM;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      system,
      tools: [
        {
          name: "emit_seo",
          description: "Return SEO metadata for the project's public page.",
          input_schema: {
            type: "object",
            properties: {
              seo_title: {
                type: "string",
                description: describe(
                  FIELD_DESCRIPTIONS.seo_title,
                  s?.seo_title_instructions,
                ),
              },
              seo_meta_description: {
                type: "string",
                description: describe(
                  FIELD_DESCRIPTIONS.seo_meta_description,
                  s?.seo_meta_description_instructions,
                ),
              },
              page_summary: {
                type: "string",
                description: describe(
                  FIELD_DESCRIPTIONS.page_summary,
                  s?.page_summary_instructions,
                ),
              },
              page_description: {
                type: "string",
                description: describe(
                  FIELD_DESCRIPTIONS.page_description,
                  s?.page_description_instructions,
                ),
              },
              section_intro: {
                type: "string",
                description: FIELD_DESCRIPTIONS.section_intro,
              },
              section_amenities: {
                type: "string",
                description: FIELD_DESCRIPTIONS.section_amenities,
              },
              section_getting_around: {
                type: "string",
                description: FIELD_DESCRIPTIONS.section_getting_around,
              },
              section_developer: {
                type: "string",
                description: FIELD_DESCRIPTIONS.section_developer,
              },
              section_faq: {
                type: "array",
                description: FIELD_DESCRIPTIONS.section_faq,
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    answer: { type: "string" },
                  },
                  required: ["question", "answer"],
                },
              },
              section_buying: {
                type: "string",
                description: FIELD_DESCRIPTIONS.section_buying,
              },
            },
            required: [
              "seo_title",
              "seo_meta_description",
              "page_summary",
              "page_description",
              "section_intro",
              "section_amenities",
              "section_getting_around",
              "section_developer",
              "section_faq",
              "section_buying",
            ],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_seo" },
      messages: [
        {
          role: "user",
          content:
            `Project facts (JSON):\n${JSON.stringify(project, null, 2)}\n\n` +
            `Nearby places (real, from map data — name these, do not invent others):\n${JSON.stringify(
              nearby ?? {},
              null,
              2,
            )}\n\nGenerate the SEO metadata.`,
        },
      ],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const out = block.input as Record<string, unknown>;
    const str = (k: string) =>
      typeof out[k] === "string" ? (out[k] as string) : "";
    // Sanitize the FAQ: keep only well-formed, non-empty Q&A pairs (max 8).
    const faq = Array.isArray(out.section_faq)
      ? (out.section_faq as unknown[])
          .filter(
            (f): f is { question: string; answer: string } =>
              !!f &&
              typeof f === "object" &&
              typeof (f as Record<string, unknown>).question === "string" &&
              typeof (f as Record<string, unknown>).answer === "string" &&
              !!(f as Record<string, string>).question.trim() &&
              !!(f as Record<string, string>).answer.trim(),
          )
          .slice(0, 8)
      : [];
    return {
      seo_title: str("seo_title"),
      seo_meta_description: str("seo_meta_description"),
      page_summary: str("page_summary"),
      page_description: str("page_description"),
      section_intro: str("section_intro"),
      section_amenities: str("section_amenities"),
      section_getting_around: str("section_getting_around"),
      section_developer: str("section_developer"),
      section_faq: faq,
      section_buying: str("section_buying"),
    };
  } catch {
    return null;
  }
}

/**
 * On publish: fill any EMPTY SEO fields on the project's public page from a
 * fresh AI generation. Never overwrites copy an admin already wrote, and never
 * throws — a failed/again-unconfigured AI call must not block publishing.
 * Returns true if it actually called the model (used to bound bulk runs).
 */
export async function maybeGenerateSeoOnPublish(
  projectId: string,
  db?: SupabaseClient,
): Promise<boolean> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return false;
    const supabase = db ?? (await createClient());
    const { data: page } = await supabase
      .from("public_project_pages")
      .select(
        "seo_title, seo_meta_description, page_summary, page_description, section_intro, section_amenities, section_getting_around, section_developer, section_faq, section_buying",
      )
      .eq("project_id", projectId)
      .maybeSingle();
    if (!page) return false;

    const hasFaq =
      Array.isArray(page.section_faq) && page.section_faq.length > 0;

    // Already fully populated — nothing to do (no AI call).
    if (
      page.seo_title &&
      page.seo_meta_description &&
      page.page_summary &&
      page.page_description &&
      page.section_intro &&
      page.section_amenities &&
      page.section_getting_around &&
      page.section_developer &&
      hasFaq &&
      page.section_buying
    ) {
      return false;
    }

    const gen = await generateSeoFields(projectId, supabase);
    if (!gen) return false;

    const update: Record<string, unknown> = {};
    if (!page.seo_title) update.seo_title = gen.seo_title;
    if (!page.seo_meta_description)
      update.seo_meta_description = gen.seo_meta_description;
    if (!page.page_summary) update.page_summary = gen.page_summary;
    if (!page.page_description) update.page_description = gen.page_description;
    if (!page.section_intro) update.section_intro = gen.section_intro;
    if (!page.section_amenities)
      update.section_amenities = gen.section_amenities;
    if (!page.section_getting_around)
      update.section_getting_around = gen.section_getting_around;
    if (!page.section_developer)
      update.section_developer = gen.section_developer;
    if (!hasFaq && gen.section_faq && gen.section_faq.length > 0)
      update.section_faq = gen.section_faq;
    if (!page.section_buying && gen.section_buying)
      update.section_buying = gen.section_buying;

    if (Object.keys(update).length > 0) {
      await supabase
        .from("public_project_pages")
        .update(update)
        .eq("project_id", projectId);
    }
    return true;
  } catch {
    return false;
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export interface SeoFieldsValue {
  seo_title: string;
  seo_meta_description: string;
  page_summary: string;
  page_description: string;
}

const PROJECT_SELECT =
  "project_name, builder_name, city, neighbourhood, province, project_type, sales_status, construction_status, ownership_type, price_from_public, price_to_public, price_currency, occupancy_estimate_text, total_units, storeys, bedrooms_summary, description_short, description_long";

const SYSTEM =
  "You are an expert SEO copywriter for a Canadian new-home / pre-construction real estate marketing site. " +
  "Write accurate, public-safe copy using ONLY the supplied project facts — never invent prices, dates, unit counts, or features that aren't given; omit anything unknown. " +
  "Weave in the city/neighbourhood and builder naturally for local SEO. No hype clichés, no ALL CAPS, no emojis.";

// Baseline per-field guidance. Admin-configured instructions (from
// seo_prompt_settings) are appended to these at generation time.
const FIELD_DESCRIPTIONS = {
  seo_title: "Up to 60 characters. Include the project name and city.",
  seo_meta_description:
    "150–160 characters. Compelling and keyword-aware; one or two sentences.",
  page_summary: "One or two plain-language sentences for the page header.",
  page_description:
    "One or two short paragraphs of public-safe marketing copy about the project.",
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
): Promise<SeoFieldsValue | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

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
      max_tokens: 1024,
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
            },
            required: [
              "seo_title",
              "seo_meta_description",
              "page_summary",
              "page_description",
            ],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_seo" },
      messages: [
        {
          role: "user",
          content: `Project facts (JSON):\n${JSON.stringify(
            project,
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
    return {
      seo_title: str("seo_title"),
      seo_meta_description: str("seo_meta_description"),
      page_summary: str("page_summary"),
      page_description: str("page_description"),
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
): Promise<boolean> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return false;
    const supabase = await createClient();
    const { data: page } = await supabase
      .from("public_project_pages")
      .select("seo_title, seo_meta_description, page_summary, page_description")
      .eq("project_id", projectId)
      .maybeSingle();
    if (!page) return false;

    // Already fully populated — nothing to do (no AI call).
    if (
      page.seo_title &&
      page.seo_meta_description &&
      page.page_summary &&
      page.page_description
    ) {
      return false;
    }

    const gen = await generateSeoFields(projectId);
    if (!gen) return false;

    const update: Record<string, string> = {};
    if (!page.seo_title) update.seo_title = gen.seo_title;
    if (!page.seo_meta_description)
      update.seo_meta_description = gen.seo_meta_description;
    if (!page.page_summary) update.page_summary = gen.page_summary;
    if (!page.page_description) update.page_description = gen.page_description;

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

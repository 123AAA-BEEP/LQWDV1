import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * Article drafter — the content half of the growth engine. Generates
 * DATA-GROUNDED drafts (project spotlights, neighbourhood guides,
 * comparisons, market updates) from PUBLIC-SAFE project data only, for human
 * review in the admin console. Nothing here auto-publishes.
 *
 * Grounding is the whole point: every fact in the prompt comes from the
 * public views (never base tables, never provenance, never broker-only
 * commercials), so the model can be specific without fabricating — the
 * defence against Google's scaled-content-abuse enforcement is that each
 * piece says true, checkable things generic content farms can't.
 */

export type ArticleType =
  | "project_spotlight"
  | "neighbourhood_guide"
  | "comparison"
  | "market_update";

export const ARTICLE_TYPES: {
  value: ArticleType;
  label: string;
  hint: string;
}[] = [
  {
    value: "project_spotlight",
    label: "Project spotlight",
    hint: "Deep dive on one project — pick exactly 1 project",
  },
  {
    value: "neighbourhood_guide",
    label: "Neighbourhood guide",
    hint: "Area-led piece anchored on 1-4 projects in the same city",
  },
  {
    value: "comparison",
    label: "Comparison",
    hint: "Head-to-head across 2-4 projects buyers actually cross-shop",
  },
  {
    value: "market_update",
    label: "Market update",
    hint: "What's new/moving — 2-6 projects, one city or region",
  },
];

export interface ArticleDraft {
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  seo_title: string;
  seo_meta_description: string;
}

interface ProjectFacts {
  project_id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  neighbourhood: string | null;
  province: string | null;
  project_type: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  price_currency: string | null;
  bedrooms_summary: string | null;
  storeys: number | null;
  total_units: number | null;
  occupancy_estimate_text: string | null;
}

const SYSTEM =
  "You write editorial content for LIQWD, a new-construction home marketplace. " +
  "Your reader is a real buyer or investor researching pre-construction homes — write the piece they would genuinely find useful, in a clear, specific, human voice. No hype, no filler, no exclamation marks. " +
  "HARD RULES: (1) Every number, name, price, and date must come from the supplied facts — if a fact isn't supplied, don't state it. Never invent amenities, incentives, appreciation figures, or timelines. " +
  "(2) Never promise investment returns or appreciation; frame investor angles as factors to weigh. " +
  "(3) Refer to projects by their real names from the facts. Weave 'view the full listing on LIQWD' references naturally — the article links to the project pages. " +
  "(4) Markdown only: ## and ### headings, short paragraphs, occasional bulleted lists. No HTML, no tables, no images. 700-1100 words. " +
  "(5) The slug must be lowercase-hyphenated, 3-8 words, no dates.";

const EMIT_ARTICLE: Anthropic.Messages.Tool = {
  name: "emit_article",
  description: "Return the finished article draft.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Reader-facing headline, 45-70 chars, specific not clickbait" },
      slug: { type: "string", description: "lowercase-hyphenated url slug, 3-8 words, no dates" },
      excerpt: { type: "string", description: "1-2 sentence standfirst shown on the index page, <= 220 chars" },
      body_md: { type: "string", description: "The article body in markdown (## / ### headings, paragraphs, lists)" },
      seo_title: { type: "string", description: "SERP title, <= 60 chars, front-load the query intent" },
      seo_meta_description: { type: "string", description: "SERP description, 140-160 chars, factual and clickworthy" },
    },
    required: ["title", "slug", "excerpt", "body_md", "seo_title", "seo_meta_description"],
  },
};

function money(n: number | null, currency: string | null): string {
  if (n == null) return "unpublished";
  return `${currency === "USD" ? "US$" : "$"}${Math.round(n).toLocaleString("en-CA")}`;
}

function factLines(p: ProjectFacts): string {
  return [
    `- ${p.project_name} (${p.slug})`,
    `  Builder: ${p.builder_name ?? "to be confirmed"}`,
    `  Location: ${[p.neighbourhood, p.city, p.province].filter(Boolean).join(", ") || "unpublished"}`,
    `  Type: ${p.project_type?.replace(/_/g, " ") ?? "unpublished"} · Status: ${p.sales_status?.replace(/_/g, " ") ?? "unpublished"}`,
    `  Pricing: from ${money(p.price_from_public, p.price_currency)}${p.price_to_public ? ` to ${money(p.price_to_public, p.price_currency)}` : ""}`,
    `  Beds: ${p.bedrooms_summary ?? "unpublished"} · Storeys: ${p.storeys ?? "unpublished"} · Units: ${p.total_units ?? "unpublished"}`,
    `  Occupancy: ${p.occupancy_estimate_text ?? "unpublished"}`,
  ].join("\n");
}

const TYPE_BRIEF: Record<ArticleType, string> = {
  project_spotlight:
    "Write a PROJECT SPOTLIGHT on the single project below: what it is, who it suits, the location story, pricing context, and what a buyer should verify next.",
  neighbourhood_guide:
    "Write a NEIGHBOURHOOD GUIDE anchored on the projects below (all in one area): lead with the area and lifestyle, then situate each project in it.",
  comparison:
    "Write a COMPARISON of the projects below for a buyer cross-shopping them: honest trade-offs on price, type, location, and timeline. No winner-crowning — help them choose for their situation.",
  market_update:
    "Write a MARKET UPDATE built from the projects below: what's actively selling, price ranges, and what that mix says about the local new-construction market right now. No forecasts.",
};

/**
 * Fetches public-safe facts and drafts one article. Returns null when the
 * API key is missing, projects resolve empty, or generation fails — callers
 * surface a friendly error; nothing throws.
 */
export async function generateArticleDraft(
  articleType: ArticleType,
  projectIds: string[],
): Promise<(ArticleDraft & { related_project_ids: string[] }) | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (projectIds.length === 0) return null;

  const supabase = await createClient();
  // Public-safe view ONLY — this is the grounding boundary. Provenance and
  // broker-only commercials structurally cannot reach the prompt.
  const { data } = await supabase
    .from("public_projects_view")
    .select(
      "project_id, slug, project_name, builder_name, city, neighbourhood, province, project_type, sales_status, price_from_public, price_to_public, price_currency, bedrooms_summary, storeys, total_units, occupancy_estimate_text",
    )
    .in("project_id", projectIds.slice(0, 6));
  const projects = (data as ProjectFacts[] | null) ?? [];
  if (projects.length === 0) return null;

  // House style from the same admin-editable settings the SEO generator uses.
  const { data: settings } = await supabase
    .from("seo_prompt_settings")
    .select("overall_instructions")
    .eq("id", 1)
    .maybeSingle();
  const overall = (settings?.overall_instructions ?? "").trim();
  const system = overall
    ? `${SYSTEM}\n\nHouse style / additional instructions:\n${overall}`
    : SYSTEM;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system,
      tools: [EMIT_ARTICLE],
      tool_choice: { type: "tool", name: "emit_article" },
      messages: [
        {
          role: "user",
          content:
            `${TYPE_BRIEF[articleType]}\n\nProject facts (the ONLY facts you may use):\n\n` +
            projects.map(factLines).join("\n\n") +
            "\n\nWrite the article now. Call emit_article exactly once.",
        },
      ],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const out = block.input as Record<string, unknown>;
    const str = (k: string) => (typeof out[k] === "string" ? (out[k] as string).trim() : "");
    const slug = str("slug")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
    if (!str("title") || !slug || slug.length < 3 || !str("body_md")) return null;
    return {
      title: str("title"),
      slug,
      excerpt: str("excerpt"),
      body_md: str("body_md"),
      seo_title: str("seo_title"),
      seo_meta_description: str("seo_meta_description"),
      related_project_ids: projects.map((p) => p.project_id),
    };
  } catch {
    return null;
  }
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Brokerage content engine: web-search-grounded deep dives on the biggest
 * Ontario brokerage brands, plus head-to-heads of the pairs new agents
 * actually cross-shop. Named-brand editorial is accurate-or-nothing, so the
 * hard rules are enforced twice — in the prompt AND in code:
 *
 *   - Only PUBLICLY PUBLISHED terms, attributed to sources; where a brand
 *     doesn't publish splits/fees (most franchise brokerages — they're
 *     negotiated per office), the piece must say exactly that instead of
 *     estimating.
 *   - No rankings, no "best", no winner-crowning (comparisons are
 *     "right-for-you-if" framing) — RECO-style verifiability, and it keeps
 *     the content non-disparaging toward brands whose agents are our users.
 *   - A verification disclaimer is APPENDED SERVER-SIDE (not left to the
 *     model), and every piece ends with a '## Sources' section.
 *   - Drafts land in the review queue like everything else — never live.
 *
 * The BROKERAGES/COMPARISONS lists double as the daily-cron backlog: slugs
 * are deterministic, so "next uncovered piece" is a simple lookup.
 */

export interface BrokerageBrand {
  name: string;
  slug: string;
}

/** The 20 brands, roughly biggest-presence-first — the cron works top-down. */
export const BROKERAGES: BrokerageBrand[] = [
  { name: "RE/MAX", slug: "remax" },
  { name: "Royal LePage", slug: "royal-lepage" },
  { name: "Century 21", slug: "century-21" },
  { name: "Keller Williams", slug: "keller-williams" },
  { name: "eXp Realty", slug: "exp-realty" },
  { name: "Real Broker", slug: "real-broker" },
  { name: "Right at Home Realty", slug: "right-at-home-realty" },
  { name: "HomeLife", slug: "homelife" },
  { name: "Sutton Group", slug: "sutton-group" },
  { name: "Coldwell Banker", slug: "coldwell-banker" },
  { name: "iPro Realty", slug: "ipro-realty" },
  { name: "Forest Hill Real Estate", slug: "forest-hill-real-estate" },
  { name: "Chestnut Park Real Estate", slug: "chestnut-park" },
  { name: "Bosley Real Estate", slug: "bosley-real-estate" },
  { name: "Sage Real Estate", slug: "sage-real-estate" },
  { name: "Property.ca", slug: "property-ca" },
  { name: "One Percent Realty", slug: "one-percent-realty" },
  { name: "Engel & Völkers", slug: "engel-volkers" },
  { name: "Sotheby's International Realty Canada", slug: "sothebys-canada" },
  { name: "Zolo Realty", slug: "zolo-realty" },
];

/** The head-to-heads new agents actually search, worked after the profiles. */
export const COMPARISONS: [string, string][] = [
  ["eXp Realty", "Real Broker"],
  ["eXp Realty", "Keller Williams"],
  ["RE/MAX", "Royal LePage"],
  ["Keller Williams", "RE/MAX"],
  ["Right at Home Realty", "iPro Realty"],
  ["Royal LePage", "Century 21"],
  ["One Percent Realty", "Right at Home Realty"],
  ["Real Broker", "Keller Williams"],
];

const bySlugName = new Map(BROKERAGES.map((b) => [b.name, b.slug]));

export function profileSlug(name: string): string {
  return `${bySlugName.get(name) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-for-new-agents-ontario`;
}

export function comparisonSlug(a: string, b: string): string {
  const s = (n: string) =>
    bySlugName.get(n) ?? n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${s(a)}-vs-${s(b)}-for-new-agents-ontario`;
}

/** Every deterministic slug in backlog order (profiles first, then pairs). */
export function backlogSlugs(): { slug: string; kind: "profile" | "comparison"; names: string[] }[] {
  return [
    ...BROKERAGES.map((b) => ({
      slug: profileSlug(b.name),
      kind: "profile" as const,
      names: [b.name],
    })),
    ...COMPARISONS.map(([a, b]) => ({
      slug: comparisonSlug(a, b),
      kind: "comparison" as const,
      names: [a, b],
    })),
  ];
}

const SYSTEM =
  "You write neutral, factual editorial for LIQWD's Insights blog about named real-estate brokerage brands in Ontario, Canada. Reader: a newly licensed or prospective Ontario agent choosing where to hang their licence. " +
  "NON-NEGOTIABLE RULES: " +
  "(1) Facts about a brand come ONLY from your web search results — the brand's own published pages or reputable coverage. Attribute plainly ('eXp publishes…', 'according to <outlet>…'). " +
  "(2) If commission splits, caps, or fees are NOT publicly published, write exactly that: they are negotiated per office/franchise and not published — NEVER estimate, infer, or repeat forum hearsay as fact. Numbers from third-party blogs may only appear clearly attributed as claims, not facts. " +
  "(3) NO rankings, no 'best', no winner. For comparisons, use 'X may fit you if… / Y may fit you if…' framing, giving both brands a fair, complete treatment. " +
  "(4) Non-disparaging: no rumours, lawsuits, reviews-site complaints, or culture gossip. Stick to model, published terms, training/programs, scale, and history. " +
  "(5) Markdown only (## and ### headings, short paragraphs, lists). 700-1100 words. End the body with a '## Sources' section listing every URL used. " +
  "(6) Do not mention LIQWD at all — the page footer handles that. " +
  "(7) No hype, no exclamation marks; write like a careful journalist.";

const EMIT: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 5 },
  {
    name: "emit_article",
    description: "Return the finished article. Call exactly once, last.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "45-75 chars, specific, neutral (no 'best')" },
        excerpt: { type: "string", description: "<= 220 chars standfirst" },
        body_md: {
          type: "string",
          description: "Markdown body ending with a '## Sources' section",
        },
        seo_title: { type: "string", description: "<= 60 chars" },
        seo_meta_description: { type: "string", description: "140-160 chars" },
        found_published_terms: {
          type: "boolean",
          description:
            "true if you found at least some officially published information about the brand(s); false if search returned essentially nothing usable",
        },
      },
      required: [
        "title",
        "excerpt",
        "body_md",
        "seo_title",
        "seo_meta_description",
        "found_published_terms",
      ],
    },
  },
];

function disclaimer(): string {
  const date = new Date().toISOString().slice(0, 10);
  return (
    "\n\n---\n\n" +
    "*Commission structures, fees, and programs vary by office and change over time. " +
    "Facts above are drawn from the cited public sources as of " +
    date +
    " and may be out of date; nothing here is advice or an endorsement. " +
    "Before joining any brokerage, confirm every term directly — in writing. " +
    "All brand names belong to their respective owners; LIQWD is independent and " +
    "not affiliated with the brokerages discussed.*"
  );
}

/**
 * Generates one brokerage piece and inserts it into the review queue.
 * Returns the article id, or null on failure / nothing-corroborated (in
 * which case nothing is inserted — accurate-or-nothing). Never throws.
 */
export async function generateBrokeragePiece(
  client: SupabaseClient,
  kind: "profile" | "comparison",
  names: string[],
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY || names.length === 0) return null;
  const slug = kind === "profile" ? profileSlug(names[0]) : comparisonSlug(names[0], names[1]);

  const brief =
    kind === "profile"
      ? `Write a DEEP DIVE on ${names[0]} for a new Ontario agent deciding where to start: what the brand is (model, scale, history in Canada/Ontario), what it PUBLISHES about new-agent economics (splits, caps, fees — or state plainly that terms are negotiated per office and not published), training/mentorship programs it advertises, and what kind of agent the model tends to fit. Search for the brand's own Canadian pages first.`
      : `Write a HEAD-TO-HEAD of ${names[0]} vs ${names[1]} for a new Ontario agent cross-shopping them: each brand's model, what each PUBLISHES about new-agent economics (or state plainly that terms aren't published and are negotiated per office), training/support each advertises, and honest 'may fit you if…' guidance for both. No winner. Give both equal depth.`;

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: `${brief}\n\nWhen done, call emit_article exactly once.`,
    },
  ];

  try {
    const anthropic = new Anthropic();
    for (let round = 0; round < 4; round++) {
      const res = await anthropic.messages.create(
        {
          model: "claude-opus-4-8",
          max_tokens: 4000,
          cache_control: { type: "ephemeral" },
          system: SYSTEM,
          tools: EMIT,
          messages,
        },
        { timeout: 90_000 },
      );

      const emit = res.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock =>
          b.type === "tool_use" && b.name === "emit_article",
      );
      if (emit) {
        const out = emit.input as Record<string, unknown>;
        const str = (k: string) =>
          typeof out[k] === "string" ? (out[k] as string).trim() : "";
        // Accurate-or-nothing: if search corroborated nothing official,
        // skip the piece entirely rather than publish thin/guessed content.
        if (out.found_published_terms !== true) return null;
        if (!str("title") || !str("body_md")) return null;
        if (!/##\s*Sources/i.test(str("body_md"))) return null;

        const { data, error } = await client
          .from("articles")
          .insert({
            slug,
            status: "in_review",
            article_type:
              kind === "profile" ? "brokerage_profile" : "brokerage_comparison",
            title: str("title"),
            excerpt: str("excerpt") || null,
            body_md: str("body_md") + disclaimer(),
            seo_title: str("seo_title") || null,
            seo_meta_description: str("seo_meta_description") || null,
            generated_by_ai: true,
          })
          .select("id")
          .maybeSingle();
        if (error || !data) return null;
        return data.id as string;
      }

      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      if (round === 0) {
        messages.push({ role: "assistant", content: res.content });
        messages.push({
          role: "user",
          content: "Call emit_article now with the finished piece.",
        });
        continue;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The next backlog piece with no existing article (any status) at its slug.
 * One query; returns null when the backlog is fully covered.
 */
export async function nextUncoveredPiece(
  client: SupabaseClient,
): Promise<{ kind: "profile" | "comparison"; names: string[] } | null> {
  const backlog = backlogSlugs();
  const { data } = await client
    .from("articles")
    .select("slug")
    .in(
      "slug",
      backlog.map((b) => b.slug),
    );
  const covered = new Set(
    ((data as { slug: string }[] | null) ?? []).map((r) => r.slug),
  );
  const next = backlog.find((b) => !covered.has(b.slug));
  return next ? { kind: next.kind, names: next.names } : null;
}

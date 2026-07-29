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

/**
 * The brands, founder-priority-first (2026-07-29: eXp, Real, RE/MAX,
 * HomeLife, Right at Home, Century 21, Royal LePage lead) — the cron works
 * top-down.
 */
export const BROKERAGES: BrokerageBrand[] = [
  { name: "eXp Realty", slug: "exp-realty" },
  { name: "Real Broker", slug: "real-broker" },
  { name: "RE/MAX", slug: "remax" },
  { name: "HomeLife", slug: "homelife" },
  { name: "Right at Home Realty", slug: "right-at-home-realty" },
  { name: "Century 21", slug: "century-21" },
  { name: "Royal LePage", slug: "royal-lepage" },
  { name: "Compass", slug: "compass" },
  { name: "Keller Williams", slug: "keller-williams" },
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
  ["Compass", "Real Broker"],
  ["eXp Realty", "Keller Williams"],
  ["RE/MAX", "Royal LePage"],
  ["Keller Williams", "RE/MAX"],
  ["Right at Home Realty", "iPro Realty"],
  ["Royal LePage", "Century 21"],
  ["One Percent Realty", "Right at Home Realty"],
  ["Real Broker", "Keller Williams"],
  ["eXp Realty", "Compass"],
];

/**
 * Platform pieces — consumer-portal landscape explained FOR AGENTS (where
 * attention actually is, what each platform charges agents, where to focus).
 * Published as agent_guide; the disclosure rule below applies: LIQWD is
 * itself a marketplace, and every piece must say so plainly.
 */
export const PLATFORM_PIECES: {
  slug: string;
  name: string;
  brief: string;
}[] = [
  {
    slug: "zillow-vs-realtor-ca-for-canadian-agents",
    name: "Zillow vs realtor.ca (for Canadian agents)",
    brief:
      "Write a piece for Ontario agents comparing Zillow's Canadian presence with realtor.ca: where Canadian buyer attention actually is (cite traffic/usage claims to sources), how listings get on each (MLS/DDF syndication), what each offers or charges agents, and where each is strong or weak for a Canadian agent's marketing. No winner-crowning.",
  },
  {
    slug: "where-ontario-home-buyers-actually-search",
    name: "Where Ontario buyers actually search",
    brief:
      "Write a piece for Ontario agents mapping the consumer search landscape: realtor.ca, HouseSigma, Zolo, Wahi, condos.ca, and portals like Zillow — what each is, who uses it, what data each shows (cite sources), and what that means for where an agent should maintain presence. No winner-crowning.",
  },
  {
    slug: "portal-fees-and-agent-programs-canada",
    name: "Portal fees & agent programs in Canada",
    brief:
      "Write a piece for Canadian agents on what the major consumer platforms offer or charge agents (advertising programs, lead products, featured placements) — ONLY publicly published offerings, cited. Where a platform doesn't publish pricing, say so. No winner-crowning.",
  },
  {
    slug: "new-construction-portals-ontario-agents",
    name: "New-construction portals for Ontario agents",
    brief:
      "Write a piece for Ontario agents on where pre-construction inventory lives online (builder sites, aggregators like BuzzBuzzHome, marketplaces) and how access differs from resale MLS. Disclose plainly that LIQWD, which publishes this article, is itself a new-construction marketplace with free agent access — one transparent sentence, no self-promotion beyond it, and do not evaluate or rank LIQWD against the others.",
  },
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

export type PieceKind = "profile" | "comparison" | "platform";

/**
 * Every deterministic slug in backlog order. Interleaved by priority: the
 * founder's 7 starter brands, then the flagship comparisons (eXp vs Real,
 * Compass vs Real), then the first platform pieces — then the long tail.
 */
export function backlogSlugs(): { slug: string; kind: PieceKind; names: string[] }[] {
  const profiles = BROKERAGES.map((b) => ({
    slug: profileSlug(b.name),
    kind: "profile" as const,
    names: [b.name],
  }));
  const comps = COMPARISONS.map(([a, b]) => ({
    slug: comparisonSlug(a, b),
    kind: "comparison" as const,
    names: [a, b],
  }));
  const plats = PLATFORM_PIECES.map((p) => ({
    slug: p.slug,
    kind: "platform" as const,
    names: [p.slug],
  }));
  return [
    ...profiles.slice(0, 7),
    ...comps.slice(0, 2),
    ...plats.slice(0, 2),
    ...profiles.slice(7),
    ...comps.slice(2),
    ...plats.slice(2),
  ];
}

const SYSTEM =
  "You write neutral, factual editorial for LIQWD's Insights blog about named real-estate brands and consumer platforms in Ontario, Canada. Reader: an Ontario agent deciding where to hang their licence or focus their marketing. " +
  "DISCLOSURE RULE for pieces about consumer platforms/portals: LIQWD, which publishes the article, is itself a real-estate marketplace — state that plainly in one sentence, never evaluate or rank LIQWD against the platforms discussed, and never disparage them. " +
  "NON-NEGOTIABLE RULES: " +
  "(1) Facts about a brand come ONLY from your web search results — the brand's own published pages or reputable coverage. Attribute plainly ('eXp publishes…', 'according to <outlet>…'). " +
  "(2) Specific splits, caps, and fees are welcome WHEN FRAMED AS RESEARCH FINDINGS: officially published terms stated plainly with attribution; office-specific or third-party-reported figures allowed but clearly framed as such ('one GTA office advertised…', 'a <year> report cited…', 'as of <date>') with the source in Sources. Where nothing is published, say exactly that — it is useful information, since terms are negotiated per office/franchise. NEVER state a bare unattributed number as fact, and never invent or estimate one. " +
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
            "true if search corroborated meaningful information about the brand(s) — official pages, published terms, or clearly attributable reporting; false ONLY if search returned essentially nothing usable about them",
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

function disclaimer(kind: PieceKind): string {
  const date = new Date().toISOString().slice(0, 10);
  if (kind === "platform") {
    return (
      "\n\n---\n\n" +
      "*Facts in this article come from our research of the cited public " +
      "sources as of " +
      date +
      ". Platforms change their features, programs, and pricing — verify " +
      "anything you plan to act on at the source. Disclosure: LIQWD, which " +
      "publishes this article, is itself a real-estate marketplace; the " +
      "platforms discussed are not affiliated with LIQWD and all brand names " +
      "belong to their respective owners. Nothing here is advice or an " +
      "endorsement.*"
    );
  }
  return (
    "\n\n---\n\n" +
    "*About the numbers in this article: figures come from our research of the " +
    "cited public sources as of " +
    date +
    ". Commission structures, caps, and fees in Ontario are frequently set " +
    "office-by-office — a figure may reflect the structure of ONE location at " +
    "the time of writing, and your local office's terms may differ. Before " +
    "making any decision, getting in touch with the local brokerage and " +
    "confirming every term in writing is critical. Nothing here is advice or " +
    "an endorsement. All brand names belong to their respective owners; LIQWD " +
    "is independent and not affiliated with the brokerages discussed.*"
  );
}

/**
 * Generates one brokerage piece and inserts it into the review queue.
 * Returns the article id, or null on failure / nothing-corroborated (in
 * which case nothing is inserted — accurate-or-nothing). Never throws.
 */
export async function generateBrokeragePiece(
  client: SupabaseClient,
  kind: PieceKind,
  names: string[],
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY || names.length === 0) return null;
  const platformPiece =
    kind === "platform"
      ? PLATFORM_PIECES.find((p) => p.slug === names[0])
      : undefined;
  if (kind === "platform" && !platformPiece) return null;
  const slug =
    kind === "profile"
      ? profileSlug(names[0])
      : kind === "comparison"
        ? comparisonSlug(names[0], names[1])
        : platformPiece!.slug;

  const brief =
    kind === "profile"
      ? `Write a DEEP DIVE on ${names[0]} for a new Ontario agent deciding where to start: what the brand is (model, scale, history in Canada/Ontario), what it PUBLISHES about new-agent economics (splits, caps, fees — or state plainly that terms are negotiated per office and not published), training/mentorship programs it advertises, and what kind of agent the model tends to fit. Search for the brand's own Canadian pages first.`
      : kind === "comparison"
        ? `Write a HEAD-TO-HEAD of ${names[0]} vs ${names[1]} for a new Ontario agent cross-shopping them: each brand's model, what each PUBLISHES about new-agent economics (or state plainly that terms aren't published and are negotiated per office), training/support each advertises, and honest 'may fit you if…' guidance for both. No winner. Give both equal depth.`
        : platformPiece!.brief;

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
              kind === "profile"
                ? "brokerage_profile"
                : kind === "comparison"
                  ? "brokerage_comparison"
                  : "agent_guide",
            title: str("title"),
            excerpt: str("excerpt") || null,
            body_md: str("body_md") + disclaimer(kind),
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
export async function nextUncoveredPieces(
  client: SupabaseClient,
  count = 1,
): Promise<{ kind: PieceKind; names: string[] }[]> {
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
  return backlog
    .filter((b) => !covered.has(b.slug))
    .slice(0, count)
    .map((b) => ({ kind: b.kind, names: b.names }));
}

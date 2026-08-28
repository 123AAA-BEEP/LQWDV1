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

/**
 * Toolkit pieces — buyer's guides for the tools of the job (cars, lockboxes,
 * signs, printing…). HARD FRAMING RULE: these are buyer's guides, never
 * "reviews" — we have no first-hand product experience and Google's reviews
 * system demotes pretend hands-on content. Specs and prices only from
 * published sources, cited. Canadian/Ontario specifics are the moat (CRA
 * vehicle rates, TRESA sign rules, board lockbox systems). No affiliate
 * links — the footer says so, which is a trust signal until that changes.
 */
export const TOOLKIT_PIECES: {
  slug: string;
  name: string;
  brief: string;
}[] = [
  {
    slug: "choosing-a-car-as-a-realtor-ontario",
    name: "Choosing a car as a realtor (Ontario)",
    brief:
      "Write a buyer's guide for Ontario agents choosing a work vehicle. The durable value is the MONEY MATH: CRA's published per-kilometre allowance rates and the deduction rules for self-employed agents (lease payments vs capital cost allowance, the passenger-vehicle caps), cited to CRA's published figures. Then the job criteria: client comfort, sign/lockbox cargo, winter reliability, fuel vs EV for high-mileage showing days. Mention vehicle classes and example models only as illustrations with cited specs — no ratings, no 'best car' verdict.",
  },
  {
    slug: "lockboxes-for-ontario-realtors",
    name: "Lockboxes for Ontario realtors",
    brief:
      "Write a buyer's guide for Ontario agents on lockboxes: mechanical push-button vs electronic/Bluetooth systems, how board-managed lockbox programs work (e.g. systems commonly used by Ontario real-estate boards — cite what the boards publish), what each type costs per published pricing, access-logging and liability considerations for sellers, and questions to ask their board/brokerage before buying. No brand ratings; published facts only.",
  },
  {
    slug: "real-estate-signs-ontario-rules-costs",
    name: "Real estate signs in Ontario: rules & costs",
    brief:
      "Write a buyer's guide for Ontario agents on for-sale signs: the COMPLIANCE layer first — TRESA advertising requirements for what must appear on a sign (registrant name as registered, brokerage name), municipal sign bylaws and where signs can/can't go (cite examples from published municipal bylaws), then the buying layer: typical sign types (lawn frames, panels, riders), materials, and published price ranges from Canadian sign printers. No vendor ranking.",
  },
  {
    slug: "print-marketing-for-realtors-canada",
    name: "Print marketing for realtors (Canada)",
    brief:
      "Write a buyer's guide for Canadian agents on print: what agents actually print (feature sheets, just-listed/just-sold postcards, farming mail, business cards), trade printers vs online services vs local print shops and when each fits, published price ranges (cited), TRESA requirements for advertising materials (registrant + brokerage identification), and the compliance nuance that CASL governs ELECTRONIC messages — addressed direct mail follows different rules (Canada Post admail). No vendor ranking.",
  },
  {
    slug: "phone-camera-setup-listing-photos",
    name: "Phone & camera setup for listing media",
    brief:
      "Write a buyer's guide for agents on shooting listing photos and video tours: what actually matters (wide-angle capability, low-light performance for basements, stabilization for walkthroughs, storage/battery for long showing days), phone vs dedicated camera vs hiring a photographer and the price math of each (published prices, cited), and when MLS/board photo standards or measurement rules apply. Mention devices only as cited-spec illustrations — no 'best phone' verdict, no review framing.",
  },
  {
    slug: "realtor-tech-stack-essentials-canada",
    name: "The realtor tech stack (Canada)",
    brief:
      "Write a buyer's guide mapping the working tech stack for a Canadian agent: e-signature, transaction/deal tracking, CRM categories, lockbox apps, and what their board/brokerage typically already includes before they buy anything (the real advice: audit included tools first). Category-level guidance with published pricing cited where available; name products only as examples, no ratings, no verdicts.",
  },
];

/**
 * Consumer pieces — plain-language evergreen explainers for buyers/owners.
 * First wave: assignment-seller content that feeds /assignment-value. Rules:
 * general information not legal/tax advice (the footer says so), facts
 * cited, and where LIQWD has a relevant free tool the piece links it ONCE
 * without salesy framing.
 */
export const CONSUMER_PIECES: {
  slug: string;
  name: string;
  brief: string;
}[] = [
  {
    slug: "sell-pre-construction-condo-before-closing-ontario",
    name: "Selling before closing (assignments 101)",
    brief:
      "Write a plain-language guide for Ontario pre-construction owners asking: can I sell my condo/town before closing? Explain what an assignment sale IS (selling the purchase agreement, not the home), the three gates (does the APS permit it, builder consent + typical fee structure, marketing restrictions many builders impose), the rough process and timeline, and what affects the price. Cite sources for factual claims. Where relevant, link ONCE to LIQWD's free assignment assessment at /assignment-value, without salesy framing.",
  },
  {
    slug: "assignment-sale-costs-hst-taxes-ontario",
    name: "Assignment costs, HST & taxes (Ontario)",
    brief:
      "Write a plain-language guide on what selling an assignment in Ontario actually costs: builder consent/administration fees (typical published ranges, cited), legal fees, commission, and the TAX layer — HST now applies to assignment sales (cite CRA's published rule and effective date) and profit may be taxed as income rather than capital gains depending on intent (cite CRA guidance). Be rigorous: every tax claim cited to CRA or reputable coverage, repeatedly note this is general information and their accountant/lawyer decides their case. Link ONCE to /assignment-value.",
  },
  {
    slug: "interim-occupancy-explained-ontario",
    name: "Interim occupancy explained",
    brief:
      "Write a plain-language guide to interim occupancy for Ontario new-condo buyers: what it is (occupying before registration/final closing), how the monthly occupancy fee is calculated (the three components under the Condominium Act — cite), why it's called 'phantom rent', how long it typically lasts, and what owners can and can't do during it (leasing and assignment typically need builder permission — cite examples). Cite sources; general information, not advice.",
  },
  {
    slug: "assignment-vs-close-then-sell-ontario",
    name: "Assign now vs. close then sell",
    brief:
      "Write a plain-language decision guide for Ontario pre-construction owners weighing an assignment sale now against closing and reselling later: the cost stack of each path (assignment: consent fees + HST considerations; closing: land transfer tax, mortgage qualification at closing, carrying costs, resale commission), timing/risk trade-offs, and which situations tend to favour each. NO verdicts or predictions — 'tends to fit when…' framing, every factual cost cited. Link ONCE to /assignment-value.",
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

export type PieceKind =
  | "profile"
  | "comparison"
  | "platform"
  | "toolkit"
  | "consumer";

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
  const kit = TOOLKIT_PIECES.map((p) => ({
    slug: p.slug,
    kind: "toolkit" as const,
    names: [p.slug],
  }));
  const consumer = CONSUMER_PIECES.map((p) => ({
    slug: p.slug,
    kind: "consumer" as const,
    names: [p.slug],
  }));
  return [
    ...profiles.slice(0, 7),
    // The assignments-101 flagship feeds the just-launched /assignment-value
    // funnel — it jumps the queue.
    ...consumer.slice(0, 1),
    ...comps.slice(0, 2),
    ...plats.slice(0, 2),
    ...kit.slice(0, 2),
    ...consumer.slice(1),
    ...profiles.slice(7),
    ...comps.slice(2),
    ...plats.slice(2),
    ...kit.slice(2),
  ];
}

const SYSTEM =
  "You write neutral, factual editorial for LIQWD's Insights blog about named real-estate brands and consumer platforms in Ontario, Canada. Reader: an Ontario agent deciding where to hang their licence or focus their marketing. " +
  "DISCLOSURE RULE for pieces about consumer platforms/portals: LIQWD, which publishes the article, is itself a real-estate marketplace — state that plainly in one sentence, never evaluate or rank LIQWD against the platforms discussed, and never disparage them. " +
  "TOOLKIT RULE for pieces about products/tools/services agents buy: frame as a BUYER'S GUIDE for the job, never a 'review' — no first-hand claims ('we tested', 'we found'), no ratings, no 'best X' verdicts. Products appear only as illustrations with specs/prices cited to published sources. Lead with the durable, checkable value (tax rules, regulations, cost math) over product talk. " +
  "CONSUMER-GUIDE RULE: when the brief says the reader is a consumer (buyer/owner, not an agent), write in plain everyday language, define jargon on first use, keep it general information — never legal, tax, or financial advice (say so where tax/legal topics arise) — and if the brief points to a LIQWD tool, link it exactly once, matter-of-factly. " +
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
  if (kind === "consumer") {
    return (
      "\n\n---\n\n" +
      "*This article is general information drawn from the cited public " +
      "sources as of " +
      date +
      " — it is not legal, tax, or financial advice, and rules change. " +
      "Assignment sales in particular can have significant HST and income-tax " +
      "consequences that depend on your situation: confirm the numbers with " +
      "your accountant and the terms with your real-estate lawyer before " +
      "acting. Nothing here is an endorsement.*"
    );
  }
  if (kind === "toolkit") {
    return (
      "\n\n---\n\n" +
      "*Specs, prices, and program details come from the cited public " +
      "sources as of " +
      date +
      " and change often — verify before you buy. This is a buyer's guide, " +
      "not a review: we haven't tested these products, nothing here is " +
      "advice or an endorsement, and LIQWD has no affiliate or paid " +
      "relationship with anything mentioned. Brand names belong to their " +
      "respective owners. Confirm tax treatment with your accountant and " +
      "advertising/compliance rules with your brokerage.*"
    );
  }
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
  const briefedPiece =
    kind === "platform"
      ? PLATFORM_PIECES.find((p) => p.slug === names[0])
      : kind === "toolkit"
        ? TOOLKIT_PIECES.find((p) => p.slug === names[0])
        : kind === "consumer"
          ? CONSUMER_PIECES.find((p) => p.slug === names[0])
          : undefined;
  if (kind !== "profile" && kind !== "comparison" && !briefedPiece) return null;
  const slug =
    kind === "profile"
      ? profileSlug(names[0])
      : kind === "comparison"
        ? comparisonSlug(names[0], names[1])
        : briefedPiece!.slug;

  const brief =
    kind === "profile"
      ? `Write a DEEP DIVE on ${names[0]} for a new Ontario agent deciding where to start: what the brand is (model, scale, history in Canada/Ontario), what it PUBLISHES about new-agent economics (splits, caps, fees — or state plainly that terms are negotiated per office and not published), training/mentorship programs it advertises, and what kind of agent the model tends to fit. Search for the brand's own Canadian pages first.`
      : kind === "comparison"
        ? `Write a HEAD-TO-HEAD of ${names[0]} vs ${names[1]} for a new Ontario agent cross-shopping them: each brand's model, what each PUBLISHES about new-agent economics (or state plainly that terms aren't published and are negotiated per office), training/support each advertises, and honest 'may fit you if…' guidance for both. No winner. Give both equal depth.`
        : briefedPiece!.brief;

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
          model: "claude-sonnet-5",
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
                  : kind === "consumer"
                    ? "consumer_guide"
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

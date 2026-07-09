import Anthropic from "@anthropic-ai/sdk";

/**
 * Hub-page copywriter — generates the cached prose + FAQ for programmatic
 * city and builder hubs. Data-grounded (every fact is supplied from real
 * inventory), jurisdiction-aware, and deliberately NON-PROMISSORY on the
 * investor angle: we point out what matters (deposit leverage, supply, rental
 * demand as a factor) and never promise appreciation. Human voice, no hype.
 *
 * Public-safe only — never sees or emits provenance/source names.
 */

export interface CityHubFacts {
  city: string;
  province: string | null;
  regionLabel: string;
  currency: string; // CAD | USD
  projectCount: number;
  priceMin: number | null;
  priceMax: number | null;
  typeCounts: { condo: number; townhouse: number; single_family: number };
  topBuilders: string[]; // real builder names, most-active first
  sampleProjects: string[]; // a few real project names for specificity
}

export interface BuilderHubFacts {
  builder: string;
  cities: string[]; // cities they're active in, on LIQWD
  projectCount: number;
  typeCounts: { condo: number; townhouse: number; single_family: number };
  sampleProjects: string[];
  primaryProvince: string | null;
}

export interface HubContent {
  intro: string;
  investor: string;
  first_time: string;
  how_it_works: string;
  faq: { question: string; answer: string }[];
  meta_title: string;
  meta_description: string;
}

/** Jurisdiction buyer-protection facts — the ONLY statute we cite, by region. */
function coolingOffFact(province: string | null): string {
  const p = (province ?? "").toLowerCase();
  if (/ontario|^on$/.test(p))
    return "Ontario: 10-day cooling-off (rescission) period for new/pre-construction CONDOS under the Condominium Act (does not apply to freehold houses).";
  if (/british columbia|^bc$/.test(p))
    return "British Columbia: 7-day rescission right for development units under REDMA.";
  if (/florida|^fl$/.test(p))
    return "Florida: 15-day rescission period for new CONDOS under FS 718.503 (condos only).";
  if (/texas|^tx$/.test(p))
    return "Texas: 6-day rescission period for new CONDOS under Property Code §82.156 (condos only).";
  return "Describe the buying process generally, WITHOUT citing a specific statute or day-count for this jurisdiction.";
}

const CITY_SYSTEM =
  "You are a knowledgeable local real-estate market writer for a new-home / pre-construction marketplace. You write clear, specific, genuinely useful copy for a city hub page — the kind a real buyer or investor would find worth reading, not filler. " +
  "STRICT RULES: Use ONLY the supplied facts (project counts, price range, home-type mix, builder names, sample projects). Never invent statistics, population/job-growth numbers, appreciation figures, school names, or specific developments not supplied. When you lack a specific, speak at the market/area level. " +
  "CURRENCY: use the supplied currency exactly; never convert or relabel (a Florida price is USD, never 'CAD'). Canadian spelling for Canadian provinces, American spelling for US states. " +
  "INVESTOR ANGLE IS EDUCATIONAL, NEVER PROMISSORY: you may explain how pre-construction deposit leverage works, why local supply/absorption and rental demand matter, and what to evaluate — but NEVER promise or predict price appreciation, guarantee returns, or give financial advice. Frame as 'what to consider', not 'this will go up'. " +
  "Write like a person: vary sentence openings, no clichés ('nestled', 'vibrant', 'boasts'), no ALL CAPS, no emojis, no marketing exclamation. Be concrete and plain.";

const BUILDER_SYSTEM =
  "You are a real-estate market writer creating a hub page for a specific home builder/developer on a new-home marketplace. Write clear, factual, non-promotional copy about the builder's presence and the homes they're bringing to market, using ONLY the supplied facts (which cities, how many projects, home types, sample project names). " +
  "Never invent awards, years in business, unit counts, project history, or reputation claims not supplied — if the builder isn't well documented, keep it general and factual. Canadian/American spelling to match the province. Human voice, no hype, no clichés, no emojis.";

function client(): Anthropic {
  return new Anthropic();
}

const HUB_TOOL = {
  name: "emit_hub",
  description: "Return the hub page copy.",
  input_schema: {
    type: "object" as const,
    properties: {
      meta_title: { type: "string", description: "Up to 60 chars. Include the city/builder and the category (new homes / pre-construction)." },
      meta_description: { type: "string", description: "150-160 chars, compelling, keyword-aware." },
      intro: {
        type: "string",
        description:
          "2-3 short paragraphs (blank-line separated) overviewing new-construction in this market: what's available, the price range and home-type mix (use the real numbers), which builders are active, and what makes buying here distinct. This is the primary head-term ranking copy — specific and substantive.",
      },
      investor: {
        type: "string",
        description:
          "1-2 short paragraphs of INVESTOR EDUCATION (non-promissory): how pre-construction deposit structures let a buyer control a unit over time, what local factors matter (supply/absorption, rental demand, home-type), and what to evaluate before buying. Never predict appreciation or guarantee returns.",
      },
      first_time: {
        type: "string",
        description:
          "1-2 short paragraphs for first-time buyers: minimum deposit reality, how incentives/rebates generally work in this jurisdiction (name only well-known programs; don't invent amounts), and why registering early can matter. General and accurate, no invented figures.",
      },
      how_it_works: {
        type: "string",
        description:
          "1-2 short paragraphs on how buying pre-construction works HERE: registration/first access, staged deposits, interim occupancy vs final closing, and the buyer-protection rule for THIS jurisdiction (cite ONLY the supplied statute/day-count).",
      },
      faq: {
        type: "array",
        description:
          "6-10 question/answer pairs a real buyer or investor would search for about THIS market (e.g. average/starting price, what home types, which builders, is it good for investors, how much deposit, cooling-off period). Answer from the supplied facts; general accurate guidance where a specific isn't supplied. Plain 2-4 sentence answers.",
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
    required: ["meta_title", "meta_description", "intro", "investor", "first_time", "how_it_works", "faq"],
    additionalProperties: false,
  },
};

function money(n: number | null, currency: string): string {
  if (n == null) return "n/a";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function parseHub(out: Record<string, unknown>): HubContent | null {
  const str = (k: string) => (typeof out[k] === "string" ? (out[k] as string) : "");
  const faq = Array.isArray(out.faq)
    ? (out.faq as unknown[])
        .filter(
          (f): f is { question: string; answer: string } =>
            !!f &&
            typeof f === "object" &&
            typeof (f as Record<string, unknown>).question === "string" &&
            typeof (f as Record<string, unknown>).answer === "string" &&
            !!(f as Record<string, string>).question.trim() &&
            !!(f as Record<string, string>).answer.trim(),
        )
        .slice(0, 10)
    : [];
  const intro = str("intro");
  if (!intro) return null;
  return {
    intro,
    investor: str("investor"),
    first_time: str("first_time"),
    how_it_works: str("how_it_works"),
    faq,
    meta_title: str("meta_title"),
    meta_description: str("meta_description"),
  };
}

export async function generateCityHub(
  facts: CityHubFacts,
): Promise<HubContent | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const typeBits = [
    facts.typeCounts.condo ? `${facts.typeCounts.condo} condo project(s)` : null,
    facts.typeCounts.townhouse ? `${facts.typeCounts.townhouse} townhome project(s)` : null,
    facts.typeCounts.single_family ? `${facts.typeCounts.single_family} single-family project(s)` : null,
  ].filter(Boolean).join(", ");

  const factBlock = [
    `City: ${facts.city}${facts.regionLabel ? `, ${facts.regionLabel}` : ""}`,
    `Jurisdiction for legal facts: ${facts.province ?? "unknown"}`,
    `Currency: ${facts.currency}`,
    `Active developments on the platform: ${facts.projectCount}`,
    `Starting-price range across them: ${money(facts.priceMin, facts.currency)} to ${money(facts.priceMax, facts.currency)}`,
    `Home-type mix: ${typeBits || "mixed"}`,
    facts.topBuilders.length ? `Active builders (real): ${facts.topBuilders.slice(0, 8).join(", ")}` : null,
    facts.sampleProjects.length ? `Sample projects (real, for specificity): ${facts.sampleProjects.slice(0, 6).join(", ")}` : null,
    `Buyer-protection rule to cite (ONLY this one): ${coolingOffFact(facts.province)}`,
  ].filter(Boolean).join("\n");

  try {
    const message = await client().messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3500,
      system: CITY_SYSTEM,
      tools: [HUB_TOOL],
      tool_choice: { type: "tool", name: "emit_hub" },
      messages: [
        {
          role: "user",
          content: `Facts for this city hub:\n${factBlock}\n\nWrite the hub copy. Ground every number in the facts above.`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    return parseHub(block.input as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function generateBuilderHub(
  facts: BuilderHubFacts,
): Promise<HubContent | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const typeBits = [
    facts.typeCounts.condo ? `${facts.typeCounts.condo} condo` : null,
    facts.typeCounts.townhouse ? `${facts.typeCounts.townhouse} townhome` : null,
    facts.typeCounts.single_family ? `${facts.typeCounts.single_family} single-family` : null,
  ].filter(Boolean).join(", ");

  const factBlock = [
    `Builder/developer: ${facts.builder}`,
    `Jurisdiction: ${facts.primaryProvince ?? "unknown"}`,
    `Active projects on the platform: ${facts.projectCount}`,
    `Cities they're building in: ${facts.cities.slice(0, 10).join(", ")}`,
    `Home types: ${typeBits || "mixed"}`,
    facts.sampleProjects.length ? `Sample projects (real): ${facts.sampleProjects.slice(0, 6).join(", ")}` : null,
    `Buyer-protection rule to cite (ONLY this one): ${coolingOffFact(facts.primaryProvince)}`,
  ].filter(Boolean).join("\n");

  try {
    const message = await client().messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      system: BUILDER_SYSTEM,
      tools: [HUB_TOOL],
      tool_choice: { type: "tool", name: "emit_hub" },
      messages: [
        {
          role: "user",
          content: `Facts for this builder hub:\n${factBlock}\n\nWrite the hub copy about this builder's current new-construction presence. The 'investor', 'first_time', and 'how_it_works' sections should be about buying this builder's pre-construction homes generally. Ground every claim in the facts.`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    return parseHub(block.input as Record<string, unknown>);
  } catch {
    return null;
  }
}

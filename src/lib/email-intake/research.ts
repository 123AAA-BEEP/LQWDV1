import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedProject } from "./extract";

/**
 * Web-research pass for hot-drop intake: when the forwarded email is too thin
 * (no city/address, or low extraction confidence), Claude searches the open
 * web — builder sites, UrbanToronto, Urbanation, BuzzBuzzHome, news — to
 * cross-reference the project and pin its geography. Facts must come from
 * sources; nothing is guessed. Returns null on any failure (caller falls back
 * to the draft + ops-ping path).
 */

export interface ResearchResult {
  /** True when the project was corroborated by at least one credible source. */
  found: boolean;
  confidence: number;
  address_full: string | null;
  city: string | null;
  builder_name: string | null;
  project_type: string | null;
  price_from: number | null;
  bedrooms_summary: string | null;
  occupancy_estimate_text: string | null;
  facts_summary: string | null;
  sources: string[];
}

/** Total wall-clock budget — the webhook has a hard 60s function cap. */
const DEADLINE_MS = 32_000;

export async function researchProject(
  ex: ExtractedProject,
): Promise<ResearchResult | null> {
  if (!process.env.ANTHROPIC_API_KEY || !ex.project_name) return null;
  const startedAt = Date.now();

  const known = [
    `Project name: ${ex.project_name}`,
    ex.builder_name ? `Builder: ${ex.builder_name}` : null,
    ex.city ? `City (unconfirmed): ${ex.city}` : "City: UNKNOWN — finding it is the top priority",
    ex.address_full ? `Address (unconfirmed): ${ex.address_full}` : "Address: UNKNOWN",
    ex.project_type ? `Type: ${ex.project_type}` : null,
    ex.notes ? `Other extracted notes: ${ex.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_search_20250305", name: "web_search", max_uses: 4 },
    {
      name: "emit_research",
      description:
        "Report the verified findings once research is complete. Call this exactly once, last.",
      input_schema: {
        type: "object" as const,
        properties: {
          found: {
            type: "boolean",
            description:
              "true only if at least one credible source confirms this project exists",
          },
          confidence: { type: "number", description: "0..1" },
          address_full: { type: ["string", "null"] },
          city: { type: ["string", "null"], description: "City in Ontario, e.g. 'Burlington'" },
          builder_name: { type: ["string", "null"] },
          project_type: {
            type: ["string", "null"],
            description: "condo | townhouse | single_family | mixed | other",
          },
          price_from: { type: ["number", "null"], description: "Starting price in CAD, only if stated by a source" },
          bedrooms_summary: { type: ["string", "null"] },
          occupancy_estimate_text: { type: ["string", "null"] },
          facts_summary: {
            type: ["string", "null"],
            description: "2-4 sentences of verified facts about the project, with no speculation",
          },
          sources: {
            type: "array",
            items: { type: "string" },
            description: "URLs of the sources the facts came from",
          },
        },
        required: ["found", "confidence", "sources"],
      },
    },
  ];

  const anthropic = new Anthropic();
  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content:
        "A new pre-construction real-estate project in Ontario, Canada was just announced " +
        "and we only have thin details from a marketing email. Cross-reference it on the web " +
        "— the builder's own site, UrbanToronto, Urbanation, BuzzBuzzHome, condos.ca, local news — " +
        "and report ONLY facts a source actually states. Top priorities: the CITY and street " +
        "address, then builder, home type, pricing, occupancy. If you cannot corroborate the " +
        "project at all, report found=false. Never guess or fill gaps from intuition.\n\n" +
        `What we have:\n${known}\n\nWhen done, call emit_research exactly once.`,
    },
  ];

  try {
    // Server-tool turns can pause; continue until emit_research or budget out.
    for (let round = 0; round < 3; round++) {
      const remaining = DEADLINE_MS - (Date.now() - startedAt);
      if (remaining < 5_000) return null;

      const res = await anthropic.messages.create(
        {
          model: "claude-opus-4-8",
          max_tokens: 2000,
          tools,
          messages,
        },
        { timeout: remaining },
      );

      const emit = res.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock =>
          b.type === "tool_use" && b.name === "emit_research",
      );
      if (emit) {
        const out = emit.input as Record<string, unknown>;
        const str = (k: string) =>
          typeof out[k] === "string" && (out[k] as string).trim()
            ? (out[k] as string).trim()
            : null;
        const num = (k: string) =>
          typeof out[k] === "number" && Number.isFinite(out[k] as number)
            ? (out[k] as number)
            : null;
        return {
          found: out.found === true,
          confidence: Math.min(Math.max(num("confidence") ?? 0, 0), 1),
          address_full: str("address_full"),
          city: str("city"),
          builder_name: str("builder_name"),
          project_type: str("project_type"),
          price_from: num("price_from"),
          bedrooms_summary: str("bedrooms_summary"),
          occupancy_estimate_text: str("occupancy_estimate_text"),
          facts_summary: str("facts_summary"),
          sources: Array.isArray(out.sources)
            ? (out.sources as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 6)
            : [],
        };
      }

      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }

      // Finished without emitting — nudge once, then give up.
      if (round === 0) {
        messages.push({ role: "assistant", content: res.content });
        messages.push({ role: "user", content: "Call emit_research now with your findings." });
        continue;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

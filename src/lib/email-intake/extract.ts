import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Email → structured project, via Claude Opus 4.8 with forced tool use
 * (`emit_project`). Multimodal: developer marketing emails are usually a graphic
 * (see the MAYA example — price, address, commission are all baked into an
 * image), so any image attachments are passed as image blocks and the model
 * reads text out of them. Mirrors the SEO generator's pattern in src/lib/seo.ts.
 */

export interface ExtractedProject {
  /** Is this actually a new-home project marketing email we should act on? */
  is_actionable: boolean;
  /** 0..1 — the model's confidence in the extraction. Gates auto-publish. */
  confidence: number;

  project_name: string | null;
  builder_name: string | null;
  project_type: string | null; // condo | townhouse | single_family | mixed | other
  city: string | null;
  address_full: string | null;

  price_from: number | null;
  price_to: number | null;
  bedrooms_summary: string | null;
  occupancy_estimate_text: string | null;

  incentives: string | null; // free-text summary of incentives/savings
  commission_summary: string | null;
  commission_percent: number | null;

  broker_portal_url: string | null;
  broker_portal_name: string | null;

  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  brokerage_name: string | null;

  notes: string | null;
}

export interface InboundImage {
  media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  /** base64-encoded image bytes (no data: prefix). */
  data: string;
}

const SYSTEM = [
  "You extract structured new-home (pre-construction) project data from a developer's",
  "marketing email for an Ontario real estate broker platform. The email may be mostly",
  "an image — read all text out of any images provided.",
  "Only set is_actionable=true if this is a real new-home project promotion (a building/",
  "community with units for sale or lease). Newsletters, event invites with no project,",
  "and unrelated mail get is_actionable=false.",
  "Extract ONLY what is stated. Never invent a price, address, commission, or portal URL.",
  "Use null for anything not present. Prices are numbers in CAD (strip $ and commas; use",
  "the discounted/'starting from' price for price_from when shown). commission_percent is",
  "a number like 3 for '3%'. confidence is your honest 0..1 certainty in the key fields",
  "(name, city, price).",
].join(" ");

const TOOL = {
  name: "emit_project",
  description: "Return the structured project extracted from the email.",
  input_schema: {
    type: "object" as const,
    properties: {
      is_actionable: { type: "boolean" },
      confidence: { type: "number", description: "0..1" },
      project_name: { type: ["string", "null"] },
      builder_name: { type: ["string", "null"] },
      project_type: {
        type: ["string", "null"],
        description: "one of: condo, townhouse, single_family, mixed, other",
      },
      city: { type: ["string", "null"] },
      address_full: { type: ["string", "null"] },
      price_from: { type: ["number", "null"] },
      price_to: { type: ["number", "null"] },
      bedrooms_summary: { type: ["string", "null"] },
      occupancy_estimate_text: { type: ["string", "null"] },
      incentives: { type: ["string", "null"] },
      commission_summary: { type: ["string", "null"] },
      commission_percent: { type: ["number", "null"] },
      broker_portal_url: { type: ["string", "null"] },
      broker_portal_name: { type: ["string", "null"] },
      contact_name: { type: ["string", "null"] },
      contact_email: { type: ["string", "null"] },
      contact_phone: { type: ["string", "null"] },
      brokerage_name: { type: ["string", "null"] },
      notes: { type: ["string", "null"] },
    },
    required: ["is_actionable", "confidence"],
    additionalProperties: false,
  },
};

function s(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function n(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Runs the extraction. Returns null if the API key is unset or the model didn't
 * return the tool call — callers treat null as "couldn't parse".
 */
export async function extractProjectFromEmail(opts: {
  subject: string | null;
  text: string | null;
  html: string | null;
  images: InboundImage[];
}): Promise<ExtractedProject | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Prefer plain text; fall back to a crude HTML strip so we always send something.
  const body =
    opts.text?.trim() ||
    (opts.html ? opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");

  const content: Anthropic.MessageParam["content"] = [
    {
      type: "text",
      text:
        `Subject: ${opts.subject ?? "(none)"}\n\n` +
        `Email body text:\n${body || "(no text — see image(s))"}\n\n` +
        `Extract the project. Read any images below for the details.`,
    },
    ...opts.images.slice(0, 8).map(
      (img) =>
        ({
          type: "image",
          source: {
            type: "base64",
            media_type: img.media_type,
            data: img.data,
          },
        }) as const,
    ),
  ];

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "emit_project" },
      messages: [{ role: "user", content }],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const o = block.input as Record<string, unknown>;

    return {
      is_actionable: o.is_actionable === true,
      confidence: n(o.confidence) ?? 0,
      project_name: s(o.project_name),
      builder_name: s(o.builder_name),
      project_type: s(o.project_type),
      city: s(o.city),
      address_full: s(o.address_full),
      price_from: n(o.price_from),
      price_to: n(o.price_to),
      bedrooms_summary: s(o.bedrooms_summary),
      occupancy_estimate_text: s(o.occupancy_estimate_text),
      incentives: s(o.incentives),
      commission_summary: s(o.commission_summary),
      commission_percent: n(o.commission_percent),
      broker_portal_url: s(o.broker_portal_url),
      broker_portal_name: s(o.broker_portal_name),
      contact_name: s(o.contact_name),
      contact_email: s(o.contact_email),
      contact_phone: s(o.contact_phone),
      brokerage_name: s(o.brokerage_name),
      notes: s(o.notes),
    };
  } catch {
    return null;
  }
}

import Anthropic from "@anthropic-ai/sdk";

/** What we pull off a RECO registration certificate. */
export interface RecoExtract {
  full_name: string; // name printed at the top (trade / operating name)
  legal_name: string; // value labelled "Legal Name", if present
  reco_registration_number: string;
  status: "registered" | "not_registered" | "suspended" | "unknown";
  expiry_date: string | null; // ISO YYYY-MM-DD
  title: string | null;
  brokerage: string | null;
}

const SYSTEM = `You extract structured data from a RECO (Real Estate Council of Ontario) registration certificate or registrant record. Read only what is present on the document — never guess or invent. A certificate often shows TWO names: the registrant's name printed at the top (a trade/operating/preferred name, e.g. "ALEX KARCZEWSKI") and a separate "Legal Name" (e.g. "Aleksander Jan Karczewski"). Capture both. RECO registration numbers are 7 digits. If a field is absent or illegible, return an empty string (or "unknown" for status). Do not infer "registered" unless the document states the registrant is registered/in good standing.`;

/**
 * Parse a RECO certificate image/PDF into structured fields via Claude
 * (forced tool use). Returns null if the model is unconfigured or errors —
 * the caller falls back to manual verification. The file bytes are passed
 * in-memory and never persisted.
 */
export async function extractRecoCertificate(
  base64: string,
  mediaType: string,
): Promise<RecoExtract | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const isPdf = mediaType === "application/pdf";
  const docBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: base64,
        },
      };

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      system: SYSTEM,
      tools: [
        {
          name: "emit_reco",
          description: "Return the registration details read off the document.",
          input_schema: {
            type: "object",
            properties: {
              full_name: { type: "string", description: "The registrant's name printed at the TOP of the certificate (trade/operating/preferred name)." },
              legal_name: { type: "string", description: "The value labelled 'Legal Name', if present. Empty otherwise." },
              reco_registration_number: {
                type: "string",
                description: "The 7-digit RECO registration number. Empty if not shown.",
              },
              status: {
                type: "string",
                enum: ["registered", "not_registered", "suspended", "unknown"],
                description: "Registration status stated on the document.",
              },
              expiry_date: {
                type: "string",
                description: "Registration expiry date as ISO YYYY-MM-DD, or empty if none.",
              },
              title: { type: "string", description: "e.g. Salesperson / Broker. Empty if none." },
              brokerage: { type: "string", description: "Brokerage name if shown. Empty if none." },
            },
            required: ["full_name", "reco_registration_number", "status"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_reco" },
      messages: [
        {
          role: "user",
          content: [
            docBlock,
            { type: "text", text: "Extract the RECO registration details from this document." },
          ],
        },
      ],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const out = block.input as Record<string, unknown>;
    const s = (k: string) => (typeof out[k] === "string" ? (out[k] as string).trim() : "");
    const statusRaw = s("status").toLowerCase();
    const status: RecoExtract["status"] =
      statusRaw === "registered" ||
      statusRaw === "not_registered" ||
      statusRaw === "suspended"
        ? (statusRaw as RecoExtract["status"])
        : "unknown";
    const expiry = s("expiry_date");
    return {
      full_name: s("full_name"),
      legal_name: s("legal_name"),
      reco_registration_number: s("reco_registration_number").replace(/\D/g, ""),
      status,
      expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
      title: s("title") || null,
      brokerage: s("brokerage") || null,
    };
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if two name tokens match exactly or by short-form prefix (≥3 chars),
 *  e.g. "alex"/"aleks…" or "rob"/"robert". */
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.startsWith(a)) return true;
  if (b.length >= 3 && a.startsWith(b)) return true;
  return false;
}

/** Lenient name match against ONE candidate name from the certificate: the
 *  last name must match a token, and the first name must match a token, a
 *  short-form of one, or (anchored by the last-name match) the first initial.
 *  Tolerates middle names, order, trade-vs-legal differences (Alex/Aleksander). */
export function recoNameMatches(
  candidate: string,
  firstName: string | null,
  lastName: string | null,
): boolean {
  if (!firstName || !lastName || !candidate) return false;
  const ex = normalize(candidate).split(" ").filter(Boolean);
  if (ex.length === 0) return false;
  const f = normalize(firstName);
  const l = normalize(lastName);
  if (!f || !l) return false;
  const lastOk = ex.some((t) => tokenMatches(t, l));
  if (!lastOk) return false;
  const firstOk =
    ex.some((t) => tokenMatches(t, f)) || ex.some((t) => t.charAt(0) === f.charAt(0));
  return firstOk;
}

/** Match the profile name against ANY name on the cert (trade name or legal name). */
function nameMatchesProfile(
  ex: RecoExtract,
  firstName: string | null,
  lastName: string | null,
): boolean {
  return [ex.full_name, ex.legal_name]
    .filter((c) => c && c.trim().length > 0)
    .some((c) => recoNameMatches(c, firstName, lastName));
}

/**
 * Decide whether an extracted certificate confidently verifies this profile:
 * status "registered", a valid 7-digit RECO number (matching the profile's if
 * one is already on file), and a name match against the trade OR legal name.
 */
export function recoCertificateApproves(
  ex: RecoExtract,
  profile: { first_name: string | null; last_name: string | null; reco_registration_number: string | null },
): boolean {
  if (ex.status !== "registered") return false;
  if (!/^\d{7}$/.test(ex.reco_registration_number)) return false;
  const onFile = (profile.reco_registration_number ?? "").replace(/\D/g, "");
  if (onFile && onFile !== ex.reco_registration_number) return false;
  return nameMatchesProfile(ex, profile.first_name, profile.last_name);
}

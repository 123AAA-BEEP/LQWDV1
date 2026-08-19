import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicProject } from "@/lib/types";

/**
 * Microsite rail — standalone single-project lead-gen landing sites served
 * from THIS app on their own domains (proxy rewrites foreign hosts to
 * /sites/[domain]). Same repo, same Supabase: content reads the live public
 * views, leads write into project_leads. The SEO contract:
 *
 *   - a microsite renders ONLY when its config is `live`; unknown or draft
 *     domains get a noindex holding page (never liqwd.ca content — the
 *     duplicate-content guard);
 *   - generated copy must be UNIQUE vs the liqwd.ca project page (enforced
 *     by prompt: different angles, never reuse page_description);
 *   - every page carries the independent-site disclosure (passing-off +
 *     builder-relations guard).
 */

export interface MicrositeContent {
  headline: string;
  subhead: string;
  intro_md: string;
  sections: { title: string; body_md: string }[];
  faq: { question: string; answer: string }[];
  cta_label: string;
  generated_at: string;
  /** Admin overrides — survive regeneration; fall back to the template/subhead. */
  seo_title?: string | null;
  seo_description?: string | null;
  edited_at?: string | null;
}

export interface MicrositeConfig {
  id: string;
  domain: string;
  project_id: string;
  skin: string;
  status: "draft" | "live" | "retired";
  context: Record<string, unknown>;
  content: MicrositeContent | null;
  capture_key: string;
}

/** Lowercase bare domain, or null when it doesn't look like one. */
export function normalizeDomain(raw: string): string | null {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .slice(0, 253);
  return /^[a-z0-9][a-z0-9.-]{2,}\.[a-z]{2,}$/.test(d) ? d : null;
}

/**
 * Detects a founder microsite directive in a forwarded intake email —
 * "microsite: echotownswaterdown.com", "microsite for x.ca", or a bare
 * "[microsite]" tag. `domainInSubject` marks the only form trusted enough to
 * trigger a domain PURCHASE (the founder controls the subject when
 * forwarding; body text can contain a marketer's stray copy).
 */
export function parseMicrositeDirective(
  subject: string | null,
  text: string | null,
): { requested: boolean; domain: string | null; domainInSubject: boolean } {
  const find = (s: string | null) =>
    s?.match(/microsite(?:\s*(?:for|:|=))?\s+((?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,})/i) ??
    null;
  const inSubject = find(subject);
  const inText = find(text);
  const hit = inSubject ?? inText;
  if (hit) {
    return {
      requested: true,
      domain: normalizeDomain(hit[1]),
      domainInSubject: Boolean(inSubject),
    };
  }
  const tagged = /\[microsite\]|\bmicrosite\b/i.test(
    `${subject ?? ""}\n${text ?? ""}`,
  );
  return { requested: tagged, domain: null, domainInSubject: false };
}

/** Brandable domain candidates for a project — shown in the intake ping. */
export function suggestDomains(name: string, city?: string | null): string[] {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 40);
  const n = slug(name);
  if (!n) return [];
  const c = city ? slug(city) : "";
  const out = [`${n}.com`, `${n}.ca`];
  if (c && !n.includes(c)) out.push(`${n}${c}.com`);
  return out;
}

/** Hosts that belong to the primary app — everything else is a microsite. */
export function isPrimaryHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  return (
    h === "liqwd.ca" ||
    h === "www.liqwd.ca" ||
    h.endsWith(".vercel.app") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export async function getMicrositeByDomain(
  domain: string,
): Promise<MicrositeConfig | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("microsite_configs")
      .select("id, domain, project_id, skin, status, context, content, capture_key")
      .eq("domain", domain.toLowerCase().replace(/^www\./, ""))
      .maybeSingle();
    return (data as MicrositeConfig | null) ?? null;
  } catch {
    return null;
  }
}

export async function getMicrositeProject(
  projectId: string,
): Promise<PublicProject | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("public_projects_view")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    return (data as PublicProject | null) ?? null;
  } catch {
    return null;
  }
}

const EMIT: Anthropic.Messages.Tool = {
  name: "emit_microsite",
  description: "Return the finished microsite content. Call exactly once.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: { type: "string", description: "Hero H1, <= 70 chars, project-name-led" },
      subhead: { type: "string", description: "One supporting line under the H1" },
      intro_md: { type: "string", description: "2-3 short paragraphs of markdown introducing the project" },
      sections: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body_md: { type: "string" },
          },
          required: ["title", "body_md"],
        },
        description: "3-5 sections ordered per the positioning context",
      },
      faq: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
      cta_label: { type: "string", description: "Lead-form button label, e.g. 'Get the price list'" },
    },
    required: ["headline", "subhead", "intro_md", "sections", "faq", "cta_label"],
  },
};

function factBlock(p: PublicProject): string {
  return [
    `Project: ${p.project_name}`,
    `Builder: ${p.builder_name ?? "to be confirmed"}`,
    `Location: ${[p.neighbourhood, p.city, p.province].filter(Boolean).join(", ")}`,
    `Type: ${p.project_type?.replace(/_/g, " ") ?? "unpublished"} · Status: ${p.sales_status?.replace(/_/g, " ") ?? "unpublished"}`,
    `Pricing: ${p.price_from_public ? `from $${Math.round(p.price_from_public).toLocaleString("en-CA")}` : "not yet released"}`,
    `Beds: ${p.bedrooms_summary ?? "unpublished"} · Storeys: ${p.storeys ?? "unpublished"} · Units: ${p.total_units ?? "unpublished"}`,
    `Occupancy: ${p.occupancy_estimate_text ?? "unpublished"}`,
    p.address_full ? `Address: ${p.address_full}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generates the microsite page content: grounded in public listing facts,
 * steered by the founder's context questionnaire, and REQUIRED to differ in
 * angle/wording from the liqwd.ca page. Returns null on failure; never
 * throws. Human reviews in admin before the site can go live.
 */
export async function generateMicrositeContent(
  config: MicrositeConfig,
  project: PublicProject,
): Promise<MicrositeContent | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const ctx = JSON.stringify(config.context ?? {}, null, 2);
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system:
        "You write the landing page for a single new-construction project's standalone microsite. Reader: a buyer who searched the project by name — high intent, wants specifics. " +
        "HARD RULES: (1) Facts ONLY from the supplied fact block — never invent pricing, dates, amenities, or incentives; where a detail isn't released yet, say so plainly ('pricing to be released' beats a guess). " +
        "(2) POSITIONING CONTEXT below steers emphasis and section ORDER — lead with what it says to lead with; omit or downplay what it says to avoid; if audience is given, write for that audience. " +
        "(3) This page must read DIFFERENTLY from a marketplace listing: write fresh angles and wording, never boilerplate. " +
        "(4) Never present this as the builder's official site. Never disparage anyone. No hype, no exclamation marks. " +
        "(5) Markdown in body fields: short paragraphs, occasional lists. FAQ answers 1-3 sentences, factual.",
      tools: [EMIT],
      tool_choice: { type: "tool", name: "emit_microsite" },
      messages: [
        {
          role: "user",
          content:
            `FACT BLOCK (the only facts you may use):\n${factBlock(project)}\n\n` +
            `POSITIONING CONTEXT (founder questionnaire — may be sparse; infer sensibly from the facts when blank):\n${ctx}\n\n` +
            "Write the microsite content now. Call emit_microsite exactly once.",
        },
      ],
    });
    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const out = block.input as Record<string, unknown>;
    if (typeof out.headline !== "string" || !Array.isArray(out.sections)) {
      return null;
    }
    return {
      headline: String(out.headline),
      subhead: String(out.subhead ?? ""),
      intro_md: String(out.intro_md ?? ""),
      sections: (out.sections as { title: string; body_md: string }[]).slice(0, 5),
      faq: Array.isArray(out.faq)
        ? (out.faq as { question: string; answer: string }[]).slice(0, 6)
        : [],
      cta_label: String(out.cta_label ?? "Get the price list"),
      generated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

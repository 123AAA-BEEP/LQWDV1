import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Project fact audit — the machine that sanity-checks live listings. Each
 * published project gets cross-referenced against the open web: does a
 * residential development by this exact name exist in this city, does the
 * builder match, is it actually new/pre-construction (not a decades-old
 * building a portfolio sweep mistook for a launch), are price and status
 * plausible. Unvetted gallery images get the same context-aware vision gate
 * heroes already pass. Findings land in project_audit_findings (admin RLS)
 * and the daily discovery digest; high-confidence criticals unpublish.
 *
 *   ?limit=3   projects per run (max 6)
 *   ?fix=1     unpublish high-confidence criticals + delete junk gallery
 *              images; without it, report-only
 *   ?ui=1      self-refreshing HTML runner — drains until the catalog is
 *              audited (then re-audits on the 30-day cadence)
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 */

const MODEL = "claude-opus-4-8";
const REAUDIT_DAYS = 30;
/** Only auto-unpublish when the web check is this sure — anything less is a
 *  flag for a human, not an action. */
const UNPUBLISH_CONFIDENCE = 0.7;

/** Gallery images may be plans/maps too — only these classes are junk. */
const GALLERY_BANNED = new Set([
  "person_headshot",
  "vehicle_or_product",
  "texture_or_decoration",
  "unrelated_subject",
]);
const GALLERY_PER_PROJECT = 4;

interface AuditIssue {
  field: string;
  severity: "minor" | "major" | "critical";
  problem: string;
  correction: string | null;
}

interface FactAudit {
  verdict: "ok" | "issues" | "critical";
  exists: boolean;
  is_new_construction: boolean;
  confidence: number;
  issues: AuditIssue[];
  summary: string;
  sources: string[];
}

interface ProjectRow {
  id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  province: string | null;
  address_full: string | null;
  project_type: string | null;
  sales_status: string | null;
  construction_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  price_currency: string | null;
  occupancy_estimate_text: string | null;
  total_units: number | null;
  storeys: number | null;
  import_notes: string | null;
}

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

async function auditFacts(p: ProjectRow): Promise<FactAudit | null> {
  const facts = [
    `Name: ${p.project_name}`,
    `Builder/developer: ${p.builder_name ?? "unknown"}`,
    `Location: ${[p.address_full, p.city, p.province].filter(Boolean).join(", ") || "unknown"}`,
    `Home type: ${p.project_type ?? "unknown"}`,
    `Sales status: ${p.sales_status ?? "unknown"} · construction: ${p.construction_status ?? "unknown"}`,
    p.price_from_public
      ? `Price: from ${p.price_from_public.toLocaleString()}${p.price_to_public ? ` to ${p.price_to_public.toLocaleString()}` : ""} ${p.price_currency ?? "CAD"}`
      : "Price: not listed",
    p.occupancy_estimate_text ? `Occupancy: ${p.occupancy_estimate_text}` : null,
    p.total_units ? `Units: ${p.total_units}` : null,
    p.storeys ? `Storeys: ${p.storeys}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_search_20250305", name: "web_search", max_uses: 5 },
    {
      name: "emit_audit",
      description: "Report the audit verdict once checks are complete. Call exactly once, last.",
      input_schema: {
        type: "object" as const,
        properties: {
          verdict: {
            type: "string",
            enum: ["ok", "issues", "critical"],
            description:
              "ok = listing checks out; issues = real project but details are wrong/stale; critical = should not be live (doesn't exist by this name, wrong city, not residential, not new construction, or a company/place mistaken for a project)",
          },
          exists: {
            type: "boolean",
            description:
              "true only if a credible source confirms a residential development by THIS EXACT NAME in this city/region",
          },
          is_new_construction: {
            type: "boolean",
            description:
              "true if new/pre-construction or completed within ~3 years; false for older existing buildings",
          },
          confidence: { type: "number", description: "0..1 — how sure the verdict is" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", description: "e.g. builder_name, city, price_from_public, sales_status, project_name" },
                severity: { type: "string", enum: ["minor", "major", "critical"] },
                problem: { type: "string", description: "Max 25 words." },
                correction: { type: ["string", "null"], description: "The correct value, only if a source states it" },
              },
              required: ["field", "severity", "problem"],
            },
          },
          summary: { type: "string", description: "1-3 sentences for the admin digest." },
          sources: { type: "array", items: { type: "string" }, description: "URLs consulted" },
        },
        required: ["verdict", "exists", "is_new_construction", "confidence", "issues", "summary", "sources"],
      },
    },
  ];

  const anthropic = new Anthropic();
  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content:
        "Audit this live marketplace listing. Cross-reference the web and report whether it is a real, current new-construction residential development and whether our details match reality. When done, call emit_audit exactly once.\n\n" +
        facts,
    },
  ];

  const DEADLINE_MS = 60_000;
  const startedAt = Date.now();
  try {
    // Server-tool turns can pause; continue until emit_audit or budget out
    // (same loop shape as the intake research pass).
    for (let round = 0; round < 4; round++) {
      const remaining = DEADLINE_MS - (Date.now() - startedAt);
      if (remaining < 5_000) return null;

      const res = await anthropic.messages.create(
        {
          model: MODEL,
          max_tokens: 2000,
          system:
            "You audit live listings on a new-construction home marketplace. Wrong or fabricated listings destroy buyer and agent trust. Verify against the open web (builder's own site first, then aggregators, news, municipal records). Report ONLY what sources state — never guess. A real company, neighbourhood, hotel, or decades-old building that got listed as a new development is CRITICAL. A real project with a wrong builder or stale price/status is ISSUES. Small stylistic differences (e.g. 'The Residences at X' vs 'X Residences', builder parent vs subsidiary) are MINOR — do not escalate them.",
          tools,
          messages,
        },
        { timeout: remaining },
      );

      const emit = res.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock =>
          b.type === "tool_use" && b.name === "emit_audit",
      );
      if (emit) {
        const out = emit.input as Record<string, unknown>;
        const issues = Array.isArray(out.issues) ? (out.issues as AuditIssue[]) : [];
        const verdict = ["ok", "issues", "critical"].includes(String(out.verdict))
          ? (String(out.verdict) as FactAudit["verdict"])
          : "issues";
        return {
          verdict,
          exists: Boolean(out.exists),
          is_new_construction: Boolean(out.is_new_construction),
          confidence: typeof out.confidence === "number" ? out.confidence : 0,
          issues,
          summary: String(out.summary ?? ""),
          sources: Array.isArray(out.sources)
            ? (out.sources as unknown[])
                .filter((s): s is string => typeof s === "string")
                .slice(0, 8)
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
        messages.push({ role: "user", content: "Call emit_audit now with your verdict." });
        continue;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Context-aware vision gate for one gallery image (mirrors the hero audit,
 *  but plans/site maps are acceptable in a gallery). */
async function vetGalleryImage(
  imageUrl: string,
  projectName: string,
  city: string | null,
): Promise<{ kind: string; junk: boolean; reason: string } | null> {
  let resp: Response;
  try {
    resp = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return { kind: "unreachable", junk: true, reason: "fetch failed" };
  }
  if (!resp.ok) return { kind: "unreachable", junk: true, reason: `fetch ${resp.status}` };
  const ct = (resp.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!ct.startsWith("image/")) return { kind: "not_image", junk: true, reason: `content-type ${ct}` };
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 2048) return { kind: "too_small", junk: true, reason: "under 2KB" };
  const media = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(ct) ? ct : "image/jpeg";

  const anthropic = new Anthropic();
  let res: Anthropic.Messages.Message;
  try {
    res = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 200,
        system:
          "You audit a gallery image on a new-home listing. Junk (cars, headshots, textures, unrelated subjects) destroys buyer trust — be strict.",
        tools: [
          {
            name: "verdict",
            description: "Report the verdict.",
            input_schema: {
              type: "object" as const,
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "exterior_rendering",
                    "interior_rendering",
                    "aerial_rendering",
                    "photo_building",
                    "lifestyle_amenity",
                    "logo_or_text",
                    "floor_plan",
                    "site_map",
                    "person_headshot",
                    "vehicle_or_product",
                    "texture_or_decoration",
                    "unrelated_subject",
                    "other",
                  ],
                },
                reason: { type: "string", description: "Max 12 words." },
              },
              required: ["kind", "reason"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "verdict" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: media as "image/jpeg", data: buf.toString("base64") },
              },
              {
                type: "text",
                text: `Gallery image for "${projectName}"${city ? ` in ${city}` : ""}. Classify it.`,
              },
            ],
          },
        ],
      },
      { timeout: 25_000 },
    );
  } catch {
    return null; // transient — leave unvetted for the next pass
  }
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return null;
  const out = block.input as Record<string, unknown>;
  const kind = String(out.kind ?? "other");
  return { kind, junk: GALLERY_BANNED.has(kind), reason: String(out.reason ?? "") };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "3", 10) || 3, 6);
  const fix = url.searchParams.get("fix") === "1";
  const ui = url.searchParams.get("ui") === "1";

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - REAUDIT_DAYS * 24 * 3600 * 1000).toISOString();
  const { data } = await admin
    .from("projects")
    .select(
      "id, slug, project_name, builder_name, city, province, address_full, project_type, sales_status, construction_status, price_from_public, price_to_public, price_currency, occupancy_estimate_text, total_units, storeys, import_notes",
    )
    .eq("record_status", "published")
    .or(`last_audited_at.is.null,last_audited_at.lt.${cutoff}`)
    .order("last_audited_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  const rows = (data ?? []) as ProjectRow[];

  const stamp = new Date().toISOString().slice(0, 10);
  const results: {
    name: string;
    verdict: string;
    confidence: number;
    unpublished: boolean;
    gallery_junked: number;
    summary: string;
  }[] = [];

  for (const p of rows) {
    // 1. Facts vs the open web.
    const audit = await auditFacts(p);

    // 2. Unvetted gallery images through the vision gate.
    const { data: mediaRows } = await admin
      .from("project_media")
      .select("id, url")
      .eq("project_id", p.id)
      .is("vetted_at", null)
      .order("sort_order", { ascending: true })
      .limit(GALLERY_PER_PROJECT);
    let galleryJunked = 0;
    const galleryIssues: AuditIssue[] = [];
    for (const m of (mediaRows ?? []) as { id: string; url: string }[]) {
      const v = await vetGalleryImage(m.url, p.project_name, p.city);
      if (!v) continue; // transient failure — retried next rotation
      if (v.junk && fix) {
        await admin.from("project_media").delete().eq("id", m.id);
        galleryJunked++;
        galleryIssues.push({
          field: "gallery",
          severity: "major",
          problem: `${v.kind}: ${v.reason}`,
          correction: "image removed",
        });
      } else {
        await admin
          .from("project_media")
          .update({ vetted_at: new Date().toISOString() })
          .eq("id", m.id);
        if (v.junk) {
          galleryIssues.push({
            field: "gallery",
            severity: "major",
            problem: `${v.kind}: ${v.reason}`,
            correction: null,
          });
        }
      }
    }

    if (!audit) {
      // Research failed outright — release the row back into rotation with a
      // bumped cursor so one flaky call doesn't wedge the queue.
      await admin
        .from("projects")
        .update({ last_audited_at: new Date().toISOString() })
        .eq("id", p.id);
      results.push({
        name: p.project_name,
        verdict: "error",
        confidence: 0,
        unpublished: false,
        gallery_junked: galleryJunked,
        summary: "audit call failed — will retry next rotation",
      });
      continue;
    }

    const issues = [...audit.issues, ...galleryIssues];
    const verdict =
      audit.verdict === "ok" && galleryIssues.length > 0 ? "issues" : audit.verdict;

    // 3. Act. Auto-unpublish only the high-confidence criticals; everything
    //    else is a finding for the admin queue + daily digest.
    const shouldUnpublish =
      fix && verdict === "critical" && audit.confidence >= UNPUBLISH_CONFIDENCE;
    const action = shouldUnpublish
      ? "unpublished to draft"
      : galleryJunked > 0
        ? `${galleryJunked} junk gallery image(s) removed`
        : "none";
    if (shouldUnpublish) {
      await admin
        .from("projects")
        .update({
          record_status: "draft",
          import_notes: `${p.import_notes ?? ""} [project-audit critical ${stamp}: ${audit.summary.slice(0, 300)}]`,
          last_audited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
    } else {
      await admin
        .from("projects")
        .update({ last_audited_at: new Date().toISOString() })
        .eq("id", p.id);
    }

    await admin.from("project_audit_findings").insert({
      project_id: p.id,
      verdict,
      confidence: audit.confidence,
      issues,
      summary: audit.summary,
      action_taken: action,
      sources: audit.sources,
    });

    results.push({
      name: p.project_name,
      verdict,
      confidence: audit.confidence,
      unpublished: shouldUnpublish,
      gallery_junked: galleryJunked,
      summary: audit.summary,
    });
  }

  const { count: remaining } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("record_status", "published")
    .or(`last_audited_at.is.null,last_audited_at.lt.${cutoff}`);

  const body = {
    ranAt: new Date().toISOString(),
    audited: results.length,
    flagged: results.filter((r) => r.verdict !== "ok").length,
    fix_mode: fix,
    results,
    remaining: remaining ?? 0,
  };

  if (ui) {
    const more = (remaining ?? 0) > 0;
    const html = `<!doctype html><meta charset="utf-8">${
      more ? `<meta http-equiv="refresh" content="3">` : ""
    }<title>Project audit</title><body style="font-family:ui-monospace,monospace;padding:24px;background:#0b1220;color:#e2e8f0"><h2 style="margin:0 0 12px">Project audit ${
      more ? "— running…" : "— done"
    }</h2><pre style="white-space:pre-wrap">${JSON.stringify(body, null, 2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre>${
      more
        ? `<p>${remaining} project(s) still due — this page refreshes until the catalog is audited.</p>`
        : "<p>Catalog audited — next pass on the re-audit cadence.</p>"
    }</body>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  }
  return NextResponse.json(body);
}

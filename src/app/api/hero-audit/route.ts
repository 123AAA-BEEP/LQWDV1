import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { imageDims } from "@/lib/email-intake/media";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hero-image quality audit — re-vets every PUBLISHED hero with the
 * context-aware vision gate (the Bentley-car / Knox-smoke-texture class of
 * mistake predates it). Batched + resumable via an import_notes marker.
 *
 *   ?limit=6     batch size (max 12)
 *   ?fix=1       null junk heroes (+ purge their media row) so the backfill
 *                runner re-sources them; without it, report-only
 *   ?ui=1        self-refreshing HTML runner — drains the whole catalog
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 */

const VISION_MODEL = "claude-opus-4-8";
const AUDIT_MARKER = "[hero-audit";

/** Hero-acceptable kinds mirror the sourcing ladder. */
const ACCEPTABLE = new Set([
  "exterior_rendering",
  "interior_rendering",
  "aerial_rendering",
  "photo_building",
  "lifestyle_amenity",
  "logo_or_text",
]);

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

async function vetHero(
  imageUrl: string,
  projectName: string,
  city: string | null,
): Promise<{ kind: string; acceptable: boolean; reason: string }> {
  let resp: Response;
  try {
    resp = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    return { kind: "unreachable", acceptable: false, reason: `fetch failed: ${e}` };
  }
  if (!resp.ok) {
    return { kind: "unreachable", acceptable: false, reason: `fetch ${resp.status}` };
  }
  const ct = (resp.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!ct.startsWith("image/")) {
    return { kind: "not_image", acceptable: false, reason: `content-type ${ct}` };
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 2048) {
    return { kind: "too_small", acceptable: false, reason: "under 2KB" };
  }
  // A grainy 300px logo stretched across a 1200px hero band is the worst
  // look we have — low-resolution heroes fail regardless of content.
  const dims = imageDims(buf, ct);
  if (dims && (dims.w < 700 || dims.h < 400)) {
    return {
      kind: "low_resolution",
      acceptable: false,
      reason: `only ${dims.w}x${dims.h}px`,
    };
  }
  const media = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(ct)
    ? ct
    : "image/jpeg";

  const anthropic = new Anthropic();
  const res = await anthropic.messages.create(
    {
      model: VISION_MODEL,
      max_tokens: 200,
      system:
        "You audit the live hero image of a new-home marketplace listing. Junk heroes (cars, textures, unrelated facilities) destroy buyer trust — be strict.",
      tools: [
        {
          name: "verdict",
          description: "Report the audit verdict.",
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
              acceptable: {
                type: "boolean",
                description:
                  "true only if this image plausibly depicts THIS property (building, suites, amenities, streetscape) or is its project/brand logo. false for vehicles/products, decorative textures/blobs, floor plans, headshots, industrial/unrelated facilities, blank or broken-looking images.",
              },
              reason: { type: "string", description: "Max 12 words." },
            },
            required: ["kind", "acceptable", "reason"],
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
              source: {
                type: "base64",
                media_type: media as "image/jpeg",
                data: buf.toString("base64"),
              },
            },
            {
              type: "text",
              text: `This is the live hero for "${projectName}"${city ? ` in ${city}` : ""}. Audit it.`,
            },
          ],
        },
      ],
    },
    { timeout: 25_000 },
  );

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    return { kind: "other", acceptable: false, reason: "no verdict" };
  }
  const out = block.input as Record<string, unknown>;
  const kind = String(out.kind ?? "other");
  return {
    kind,
    // Trust the boolean AND require a ladder-acceptable kind as a backstop.
    acceptable: Boolean(out.acceptable) && ACCEPTABLE.has(kind),
    reason: String(out.reason ?? ""),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "6", 10) || 6, 12);
  const fix = url.searchParams.get("fix") === "1";
  const ui = url.searchParams.get("ui") === "1";

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select("id, project_name, city, hero_image_url, import_notes")
    .eq("record_status", "published")
    .not("hero_image_url", "is", null)
    .not("import_notes", "ilike", `%${AUDIT_MARKER}%`)
    .limit(limit);

  const rows = (data ?? []) as {
    id: string;
    project_name: string;
    city: string | null;
    hero_image_url: string;
    import_notes: string | null;
  }[];

  const stamp = new Date().toISOString().slice(0, 10);
  const results: {
    name: string;
    kind: string;
    acceptable: boolean;
    fixed: boolean;
    reason: string;
  }[] = [];

  for (const p of rows) {
    const v = await vetHero(p.hero_image_url, p.project_name, p.city);
    let fixed = false;
    if (v.acceptable) {
      await supabase
        .from("projects")
        .update({
          import_notes: `${p.import_notes ?? ""} [hero-audit ok ${stamp}: ${v.kind}]`,
        })
        .eq("id", p.id);
    } else if (fix) {
      // Null the hero + purge its media row; the backfill runner re-sources
      // through the strict ladder.
      await supabase
        .from("project_media")
        .delete()
        .eq("project_id", p.id)
        .eq("url", p.hero_image_url);
      await supabase
        .from("projects")
        .update({
          hero_image_url: null,
          hero_image_alt: null,
          import_notes: `${p.import_notes ?? ""} [hero-audit junk ${stamp}: ${v.kind} — ${v.reason}; cleared for re-source.]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      fixed = true;
    }
    results.push({
      name: p.project_name,
      kind: v.kind,
      acceptable: v.acceptable,
      fixed,
      reason: v.reason,
    });
  }

  const { count: remaining } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("record_status", "published")
    .not("hero_image_url", "is", null)
    .not("import_notes", "ilike", `%${AUDIT_MARKER}%`);

  const body = {
    ranAt: new Date().toISOString(),
    audited: results.length,
    junk_found: results.filter((r) => !r.acceptable).length,
    fix_mode: fix,
    results,
    remaining: remaining ?? 0,
  };

  if (ui) {
    const more = (remaining ?? 0) > 0;
    const html = `<!doctype html><meta charset="utf-8">${
      more ? `<meta http-equiv="refresh" content="3">` : ""
    }<title>Hero audit</title><body style="font-family:ui-monospace,monospace;padding:24px;background:#0b1220;color:#e2e8f0"><h2 style="margin:0 0 12px">Hero audit ${
      more ? "— running…" : "— done"
    }</h2><pre style="white-space:pre-wrap">${JSON.stringify(body, null, 2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre>${
      more
        ? `<p>${remaining} hero(s) left — this page refreshes until the catalog is audited.</p>`
        : "<p>Catalog audited.</p>"
    }</body>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  }
  return NextResponse.json(body);
}

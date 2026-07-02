import { createAdminClient } from "@/lib/supabase/admin";
import { maybeGenerateSeoOnPublish } from "@/lib/seo";
import { pingIndexNow } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * SEO content backfill for published project pages.
 *
 * ?key=<INBOUND_EMAIL_SECRET> required. Finds published, active pages that are
 * missing any AI content (seo_title, FAQ, or the buying section) and fills the
 * empty fields via the same generator used on publish (never overwrites
 * admin-written copy). &ui=1 returns a self-refreshing progress page that runs
 * until every published page is fully populated. &limit=N (1–4, default 2 —
 * each generation is a slow Opus call, so batches stay inside the function's
 * time budget and progress comes from auto-continuation, not big batches).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  // ONE generation per pass: a single Opus call runs 30-60s, and the function
  // itself is capped at 60s — two per pass guaranteed a gateway timeout that
  // killed the auto-refresh chain. Progress comes from continuation, not batch.
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 1, 1), 2);
  const ui = url.searchParams.get("ui") === "1";
  const admin = createAdminClient();

  // Candidates: active pages of published projects missing any AI field.
  const { data: pages } = await admin
    .from("public_project_pages")
    .select("project_id, slug, seo_title, section_faq, section_buying")
    .eq("is_active", true)
    .or("seo_title.is.null,section_faq.is.null,section_buying.is.null")
    .limit(400);
  const candidateIds = ((pages ?? []) as {
    project_id: string;
    slug: string;
  }[]).map((p) => ({ id: p.project_id, slug: p.slug }));

  // Keep only genuinely-published projects (view rules), preserving order.
  let published = new Set<string>();
  if (candidateIds.length > 0) {
    const { data: projs } = await admin
      .from("projects")
      .select("id")
      .in("id", candidateIds.map((c) => c.id))
      .eq("record_status", "published")
      .eq("public_page_enabled", true);
    published = new Set(((projs ?? []) as { id: string }[]).map((p) => p.id));
  }
  const queue = candidateIds.filter((c) => published.has(c.id));

  // Random pick instead of head-of-queue: if one page's generation keeps
  // running long, it can't block the whole chain — the next pass moves on.
  const shuffled = [...queue].sort(() => Math.random() - 0.5);
  const batch = shuffled.slice(0, limit);

  const results: { slug: string; generated: boolean; note?: string }[] = [];
  for (const item of batch) {
    // Soft 48s guard: abandon a slow generation before the platform kills the
    // whole request, so the response (and the refresh chain) always lands.
    const generated = await Promise.race<boolean | "slow">([
      maybeGenerateSeoOnPublish(item.id, admin),
      new Promise<"slow">((r) => setTimeout(() => r("slow"), 48_000)),
    ]);
    results.push(
      generated === "slow"
        ? { slug: item.slug, generated: false, note: "slow — will retry" }
        : { slug: item.slug, generated },
    );
  }

  // Freshness ping for the pages that just gained content.
  const touched = results.filter((r) => r.generated).map((r) => `/projects/${r.slug}`);
  if (touched.length > 0) await pingIndexNow([...touched, "/sitemap.xml"]);

  const remaining = queue.length - batch.length;
  const done = batch.length === 0;

  if (!ui) {
    return Response.json({ ok: true, processed: results.length, remaining, results });
  }

  const selfUrl = `${url.pathname}?key=${encodeURIComponent(
    url.searchParams.get("key") ?? "",
  )}&mode=run&ui=1&limit=${limit}`;
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.slug}</td><td>${r.note ?? (r.generated ? "✍️ generated" : "already complete")}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><title>SEO backfill</title>
${!done ? `<meta http-equiv="refresh" content="1; url=${selfUrl}">` : ""}
<style>body{font-family:system-ui;margin:2rem;color:#0f172a}table{border-collapse:collapse;margin-top:1rem}td,th{border:1px solid #e2e8f0;padding:4px 10px;font-size:14px;text-align:left}.big{font-size:2rem;font-weight:700}.muted{color:#64748b}</style>
</head><body>
<h1>SEO content backfill</h1>
<p class="big">${remaining} pages left</p>
${
  done
    ? "<p>✅ <strong>Done.</strong> Every published page has full SEO content (title, meta, sections, FAQ, buying guide).</p>"
    : "<p>⏳ Running — this page refreshes itself. Keep it open. Each pass writes full AI content for up to " + limit + " pages.</p>"
}
<table><tr><th>Page</th><th>Result</th></tr>${rows}</table>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

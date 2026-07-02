import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import seedData from "@/lib/iciworld/seed-data.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ICIWorld importer / enricher.
 *
 * ?key=<INBOUND_EMAIL_SECRET> is required (so it's not public). Modes:
 *   mode=probe&u=<url>   — fetch a page server-side and stash HTML in iciworld_raw
 *                          (used to develop the parser; default target Result1.jsp).
 *   mode=seed            — bulk-insert the parsed Haves & Wants board (seed-data.json)
 *                          into off_market_listings as UNCLAIMED rows. Idempotent.
 *   mode=enrich          — fetch each listing's DispRec.jsp detail page and extract
 *                          the posting agent's contact (name/brokerage/email/phone/
 *                          city) onto the row. Batched; &ui=1 returns an HTML page
 *                          that auto-refreshes until every listing is attempted.
 *                          &limit=N (1–20, default 10), &force=1 re-attempts fails.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-CA,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
};

type Seed = { ref: string; title: string; kind: string; status: string | null };

/** Primes a session cookie from the ICIWorld homepage (best-effort). */
async function primeCookie(): Promise<string> {
  try {
    const home = await fetch("https://iciworld.com/", {
      headers: BROWSER_HEADERS,
      redirect: "follow",
    });
    await home.text(); // drain so the connection completes
    const sc = home.headers.get("set-cookie");
    if (sc) return sc.split(",").map((c) => c.split(";")[0].trim()).join("; ");
  } catch {
    /* best-effort */
  }
  return "";
}

/** Browser-mimicking fetch with primed cookie + same-site referer. */
async function fetchIci(url: string, cookie: string): Promise<Response> {
  return fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Referer: "https://iciworld.com/",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: "follow",
  });
}

/** Strips tags/scripts to visible-ish text for LLM extraction. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Emails from raw HTML (mailto + plain), excluding ICIWorld's own + asset false-positives. */
function extractEmails(html: string): string[] {
  const found = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const bad = /(@iciworld\.com$)|(\.(png|jpe?g|gif|webp|svg|css|js)$)/i;
  return [...new Set(found.map((e) => e.toLowerCase()))].filter((e) => !bad.test(e));
}

/** First North-American phone number in the text, if any. */
function extractPhone(text: string): string | null {
  const m = text.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return m ? m[0].trim() : null;
}

interface LlmContact {
  is_listing_page: boolean;
  agent_name: string | null;
  brokerage_name: string | null;
  email: string | null;
  phone: string | null;
  city_region: string | null;
}

/** Claude extraction of the posting member's contact block. Never throws. */
async function llmExtract(pageText: string, title: string): Promise<LlmContact | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const anthropic = new Anthropic();
    const res = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      tool_choice: { type: "tool", name: "emit_contact" },
      tools: [
        {
          name: "emit_contact",
          description: "Report the posting agent's contact details from the page.",
          input_schema: {
            type: "object" as const,
            properties: {
              is_listing_page: {
                type: "boolean",
                description:
                  "true only if this is a real-estate listing detail page with a member/agent contact block (not a login/error page)",
              },
              agent_name: { type: ["string", "null"], description: "The posting agent's full name" },
              brokerage_name: { type: ["string", "null"], description: "Their brokerage/company" },
              email: { type: ["string", "null"] },
              phone: { type: ["string", "null"] },
              city_region: {
                type: ["string", "null"],
                description: "The property's city/region if stated (not the agent's office city)",
              },
            },
            required: ["is_listing_page"],
          },
        },
      ],
      messages: [
        {
          role: "user",
          content:
            "This is text from an ICIWorld 'Haves & Wants' commercial real-estate listing detail page. " +
            `The listing headline is: "${title.slice(0, 200)}". ` +
            "Extract the POSTING MEMBER/AGENT's contact details (name, brokerage, email, phone) and the " +
            "property's city/region if stated. Use null for anything not present. Do not invent values.\n\n" +
            pageText.slice(0, 9000),
        },
      ],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    return block && block.type === "tool_use" ? (block.input as unknown as LlmContact) : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const mode = url.searchParams.get("mode") ?? "probe";
  const admin = createAdminClient();

  // ---- SEED: insert the parsed board as unclaimed off-market listings -------
  if (mode === "seed") {
    const rows = seedData as Seed[];
    const { data: existing } = await admin
      .from("off_market_listings")
      .select("source_ref")
      .eq("source", "iciworld");
    const have = new Set(
      ((existing ?? []) as { source_ref: string | null }[])
        .map((r) => r.source_ref)
        .filter(Boolean),
    );

    // Never re-seed refs an admin removed / an agent opted out of (CASL).
    const { data: suppressedRows } = await admin
      .from("off_market_suppressed_refs")
      .select("source_ref")
      .eq("source", "iciworld");
    const suppressed = new Set(
      ((suppressedRows ?? []) as { source_ref: string }[]).map((r) => r.source_ref),
    );

    const toInsert = rows
      .filter((r) => !have.has(r.ref) && !suppressed.has(r.ref))
      .map((r) => ({
        source: "iciworld",
        source_ref: r.ref,
        title: r.title,
        post_kind: r.kind,
        listing_status: r.status,
        // Sourced placeholders stay dark until their agent claims them.
        status: "pending_claim",
      }));

    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await admin.from("off_market_listings").insert(batch);
      if (error) errors.push(error.message);
      else inserted += batch.length;
    }

    return Response.json({
      ok: errors.length === 0,
      total: rows.length,
      alreadyPresent: have.size,
      inserted,
      errors,
    });
  }

  // ---- ENRICH: pull agent contact from each listing's detail page -----------
  if (mode === "enrich") {
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit")) || 10, 1),
      20,
    );
    const force = url.searchParams.get("force") === "1";
    const ui = url.searchParams.get("ui") === "1";

    let candidatesQuery = admin
      .from("off_market_listings")
      .select(
        "id, source_ref, title, realtor_name, brokerage_name, contact_phone, contact_email, claim_email, city_region",
      )
      .eq("source", "iciworld")
      .is("claimed_by_profile_id", null)
      .is("claim_email", null)
      .order("source_ref", { ascending: true })
      .limit(limit);
    if (!force) candidatesQuery = candidatesQuery.is("enrich_attempted_at", null);
    const { data: candidates } = await candidatesQuery;
    const batch = (candidates ?? []) as {
      id: string;
      source_ref: string | null;
      title: string;
      realtor_name: string | null;
      brokerage_name: string | null;
      contact_phone: string | null;
      contact_email: string | null;
      claim_email: string | null;
      city_region: string | null;
    }[];

    const results: { ref: string; ok: boolean; email: string | null; name: string | null; note: string }[] = [];
    let sampleStashed = false;

    if (batch.length > 0) {
      const cookie = await primeCookie();

      // Small concurrency so a batch fits inside the function's time budget.
      const CHUNK = 3;
      for (let i = 0; i < batch.length; i += CHUNK) {
        await Promise.all(
          batch.slice(i, i + CHUNK).map(async (row) => {
            const ref = row.source_ref ?? "";
            const target = `https://iciworld.com/DispRec.jsp?ft=ntce+${ref}`;
            const attemptedAt = new Date().toISOString();
            try {
              const res = await fetchIci(target, cookie);
              const html = await res.text();

              if (!res.ok || html.length < 200) {
                await admin.from("iciworld_raw").insert({
                  url: target,
                  http_status: res.status,
                  content_type: res.headers.get("content-type"),
                  body: html.slice(0, 100_000),
                  note: `enrich-fail ref=${ref} len=${html.length}`,
                });
                await admin
                  .from("off_market_listings")
                  .update({ enrich_attempted_at: attemptedAt })
                  .eq("id", row.id);
                results.push({ ref, ok: false, email: null, name: null, note: `HTTP ${res.status}` });
                return;
              }

              // Keep one raw sample per run so the parser can be tuned offline.
              if (!sampleStashed) {
                sampleStashed = true;
                await admin.from("iciworld_raw").insert({
                  url: target,
                  http_status: res.status,
                  content_type: res.headers.get("content-type"),
                  body: html.slice(0, 300_000),
                  note: `enrich-sample ref=${ref}`,
                });
              }

              const text = stripHtml(html);
              const emails = extractEmails(html);
              const llm = await llmExtract(text, row.title);

              const email = emails[0] ?? llm?.email?.toLowerCase() ?? null;
              const phone = llm?.phone ?? extractPhone(text);
              const name = llm?.agent_name ?? null;

              // Non-destructive fill: only set fields that are still empty.
              const update: Record<string, unknown> = { enrich_attempted_at: attemptedAt };
              if (email) {
                update.claim_email = email;
                if (!row.contact_email) update.contact_email = email;
              }
              if (name && !row.realtor_name) update.realtor_name = name;
              if (llm?.brokerage_name && !row.brokerage_name) update.brokerage_name = llm.brokerage_name;
              if (phone && !row.contact_phone) update.contact_phone = phone;
              if (llm?.city_region && !row.city_region) update.city_region = llm.city_region;

              await admin.from("off_market_listings").update(update).eq("id", row.id);
              results.push({
                ref,
                ok: Boolean(email || name),
                email,
                name,
                note: email ? "ok" : llm?.is_listing_page === false ? "not a listing page" : "no contact found",
              });
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              await admin.from("iciworld_raw").insert({ url: target, note: `enrich-error ref=${ref}: ${message}` });
              await admin
                .from("off_market_listings")
                .update({ enrich_attempted_at: attemptedAt })
                .eq("id", row.id);
              results.push({ ref, ok: false, email: null, name: null, note: message.slice(0, 120) });
            }
          }),
        );
      }
    }

    // Progress accounting.
    const { count: remaining } = await admin
      .from("off_market_listings")
      .select("id", { count: "exact", head: true })
      .eq("source", "iciworld")
      .is("claimed_by_profile_id", null)
      .is("claim_email", null)
      .is("enrich_attempted_at", null);
    const { count: withEmail } = await admin
      .from("off_market_listings")
      .select("id", { count: "exact", head: true })
      .eq("source", "iciworld")
      .not("claim_email", "is", null);

    const processed = results.length;
    const succeeded = results.filter((r) => r.ok).length;
    const allFailed = processed > 0 && succeeded === 0;
    const done = (remaining ?? 0) === 0 || processed === 0;

    if (!ui) {
      return Response.json({
        ok: true,
        processed,
        succeeded,
        remaining: remaining ?? 0,
        totalWithEmail: withEmail ?? 0,
        results,
      });
    }

    // Auto-continuing progress page: refresh until nothing is left (or we're
    // clearly being blocked, so a human can intervene instead of hammering).
    const selfUrl = `${url.pathname}?key=${encodeURIComponent(url.searchParams.get("key") ?? "")}&mode=enrich&ui=1&limit=${limit}${force ? "&force=1" : ""}`;
    const keepGoing = !done && !allFailed;
    const rowsHtml = results
      .map(
        (r) =>
          `<tr><td>${r.ref}</td><td>${r.ok ? "✅" : "❌"}</td><td>${r.name ?? ""}</td><td>${r.email ?? ""}</td><td>${r.note}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><title>ICIWorld enrichment</title>
${keepGoing ? `<meta http-equiv="refresh" content="2; url=${selfUrl}">` : ""}
<style>body{font-family:system-ui;margin:2rem;color:#0f172a}table{border-collapse:collapse;margin-top:1rem}td,th{border:1px solid #e2e8f0;padding:4px 10px;font-size:14px;text-align:left}.big{font-size:2rem;font-weight:700}.muted{color:#64748b}</style>
</head><body>
<h1>ICIWorld contact enrichment</h1>
<p class="big">${withEmail ?? 0} / 401 have an agent email</p>
<p class="muted">${remaining ?? 0} listings left to attempt · this batch: ${succeeded}/${processed} succeeded</p>
${
  keepGoing
    ? `<p>⏳ Running — this page refreshes itself every 2s. Keep it open.</p>`
    : allFailed
      ? `<p>🛑 <strong>Every fetch in this batch failed — ICIWorld appears to be blocking the server.</strong> Stopped auto-retrying. Tell Claude the run failed and it will switch to the browser-side fallback.</p>`
      : `<p>✅ <strong>Done.</strong> Every listing has been attempted. Tell Claude to export the contact list + cross-reference members.</p>`
}
<table><tr><th>Ref</th><th>OK</th><th>Agent</th><th>Email</th><th>Note</th></tr>${rowsHtml}</table>
</body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // ---- PROBE: fetch a page and stash its HTML for parser development --------
  const target = url.searchParams.get("u") ?? "https://iciworld.com/Result1.jsp";
  try {
    const cookie = await primeCookie();
    const res = await fetchIci(target, cookie);
    const body = await res.text();
    await admin.from("iciworld_raw").insert({
      url: res.url,
      http_status: res.status,
      content_type: res.headers.get("content-type"),
      body: body.slice(0, 300_000),
      note: `mode=${mode} fullLength=${body.length} cookie=${cookie ? "yes" : "no"}`,
    });
    return Response.json({
      ok: res.status < 400,
      status: res.status,
      finalUrl: res.url,
      length: body.length,
      primedCookie: Boolean(cookie),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("iciworld_raw")
      .insert({ url: target, note: `ERROR: ${message}` });
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}

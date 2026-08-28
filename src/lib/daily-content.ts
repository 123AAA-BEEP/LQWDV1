import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateArticleDraft } from "@/lib/articles";
import {
  generateBrokeragePiece,
  nextUncoveredPieces,
} from "@/lib/brokerage-content";
import { finishAndPublish } from "@/lib/editor-in-chief";
import { sendEmail, brandedEmail } from "@/lib/email";

/**
 * The daily content pipeline (cron: /api/cron/daily-content). Every morning
 * it drafts up to two pieces INTO THE REVIEW QUEUE — never straight to
 * publish:
 *
 *   1. Project of the day — a spotlight on a published project no article
 *      has covered yet (grounded in public listing facts, via lib/articles).
 *   2. Market note — grounded in TWO real sources: aggregate stats computed
 *      from our own published inventory, plus fresh Ontario new-construction
 *      news pulled with the Anthropic web-search tool (facts must cite
 *      sources; the article ends with a Sources list).
 *
 * Human review stays mandatory: drafts land as status='in_review' (admin nav
 * badge + ops email), and generation SKIPS entirely while the unreviewed
 * queue is at capacity — automation must never manufacture a backlog of
 * unread AI content.
 */

const QUEUE_CAP = 8;

export interface DailyContentResult {
  spotlight: string | null; // article id or null
  marketNote: string | null;
  comparison: string | null;
  brokeragePiece: string | null;
  published: number;
  heldForReview: number;
  skipped: string[];
  queued: number;
}

/**
 * Market notes are MONTHLY, not daily (founder call 2026-08-11): one per
 * calendar month, attempted only from this day of the month onward so the
 * note lands after TRREB publishes its Market Watch stats (first week of
 * the month) and can cite fresh numbers.
 */
const MARKET_NOTE_EARLIEST_DAY = 5;
const MARKET_NOTE_MIN_GAP_DAYS = 21;

/** Service-role client typed loosely — tables aren't in generated types yet. */
type Admin = SupabaseClient;

async function unreviewedCount(admin: Admin): Promise<number> {
  const { count } = await admin
    .from("articles")
    .select("id", { count: "exact", head: true })
    .in("status", ["in_review"]);
  return count ?? 0;
}

/**
 * Picks the published project most worth spotlighting that no existing
 * spotlight covers: has a hero image and public pricing (a spotlight without
 * either reads thin), newest first so fresh launches get coverage while
 * they're news.
 */
async function pickSpotlightProject(admin: Admin): Promise<string | null> {
  const { data: covered } = await admin
    .from("articles")
    .select("related_project_ids")
    .eq("article_type", "project_spotlight");
  const coveredIds = new Set(
    ((covered as { related_project_ids: string[] }[] | null) ?? []).flatMap(
      (r) => r.related_project_ids ?? [],
    ),
  );

  const { data } = await admin
    .from("public_projects_view")
    .select("project_id, published_at")
    .not("hero_image_url", "is", null)
    .not("price_from_public", "is", null)
    .order("published_at", { ascending: false })
    .limit(400);
  for (const row of (data as
    | { project_id: string; published_at: string | null }[]
    | null) ?? []) {
    if (!coveredIds.has(row.project_id)) return row.project_id;
  }
  return null;
}

/** True when it's time for this month's market note. */
async function marketNoteDue(admin: Admin): Promise<boolean> {
  if (new Date().getUTCDate() < MARKET_NOTE_EARLIEST_DAY) return false;
  // Any recent attempt counts (held drafts included) — one note per cycle.
  const { data } = await admin
    .from("articles")
    .select("created_at")
    .eq("article_type", "market_update")
    .order("created_at", { ascending: false })
    .limit(1);
  const last = (data as { created_at: string }[] | null)?.[0]?.created_at;
  if (!last) return true;
  const ageDays = (Date.now() - new Date(last).getTime()) / 86_400_000;
  return ageDays >= MARKET_NOTE_MIN_GAP_DAYS;
}

/**
 * Picks the newest uncovered cross-shop pair for a comparison article: same
 * city, same type, both priced with heroes, nearest-priced peer — and not
 * already the subject of an existing comparison piece.
 */
async function pickComparisonPair(admin: Admin): Promise<[string, string] | null> {
  const { data: covered } = await admin
    .from("articles")
    .select("related_project_ids")
    .eq("article_type", "comparison");
  const coveredPairs = new Set<string>();
  for (const r of (covered as { related_project_ids: string[] }[] | null) ?? []) {
    const ids = r.related_project_ids ?? [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        coveredPairs.add([ids[i], ids[j]].sort().join("|"));
      }
    }
  }

  const { data } = await admin
    .from("public_projects_view")
    .select("project_id, city, project_type, price_from_public, published_at")
    .not("price_from_public", "is", null)
    .not("hero_image_url", "is", null)
    .not("city", "is", null)
    .not("project_type", "is", null)
    .order("published_at", { ascending: false })
    .limit(400);
  const rows = (data as
    | {
        project_id: string;
        city: string;
        project_type: string;
        price_from_public: number;
      }[]
    | null) ?? [];

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.city}|${r.project_type}`;
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }
  // Newest-first: fresh launches get compared while they're news.
  for (const p of rows) {
    const peers = (groups.get(`${p.city}|${p.project_type}`) ?? [])
      .filter((o) => o.project_id !== p.project_id)
      .sort(
        (a, b) =>
          Math.abs(a.price_from_public - p.price_from_public) -
          Math.abs(b.price_from_public - p.price_from_public),
      );
    for (const peer of peers.slice(0, 3)) {
      const key = [p.project_id, peer.project_id].sort().join("|");
      if (!coveredPairs.has(key)) return [p.project_id, peer.project_id];
    }
  }
  return null;
}

/** Drafts a project-comparison article into the review queue. */
async function generateComparisonPiece(admin: Admin): Promise<string | null> {
  const pair = await pickComparisonPair(admin);
  if (!pair) return null;
  const draft = await generateArticleDraft("comparison", pair, admin);
  if (!draft) return null;
  return insertReviewDraft(admin, {
    ...draft,
    article_type: "comparison",
    excerpt: draft.excerpt || null,
    seo_title: draft.seo_title || null,
    seo_meta_description: draft.seo_meta_description || null,
  });
}

/** Inserts a draft into the review queue; returns the new article id. */
async function insertReviewDraft(
  admin: Admin,
  draft: {
    slug: string;
    article_type: string;
    title: string;
    excerpt: string | null;
    body_md: string;
    seo_title: string | null;
    seo_meta_description: string | null;
    related_project_ids: string[];
  },
): Promise<string | null> {
  for (const slug of [
    draft.slug,
    `${draft.slug}-${Date.now().toString(36).slice(-4)}`.slice(0, 120),
  ]) {
    const { data, error } = await admin
      .from("articles")
      .insert({ ...draft, slug, status: "in_review", generated_by_ai: true })
      .select("id")
      .maybeSingle();
    if (!error && data) return data.id as string;
    if (error?.code !== "23505") return null;
  }
  return null;
}

/** Compact inventory stats from our own published listings — real data. */
async function inventoryStats(admin: Admin): Promise<string> {
  const { data } = await admin
    .from("public_projects_view")
    .select("city, project_type, price_from_public, published_at")
    .limit(3000);
  const rows =
    (data as
      | {
          city: string | null;
          project_type: string | null;
          price_from_public: number | null;
          published_at: string | null;
        }[]
      | null) ?? [];
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const byCity = new Map<string, { n: number; recent: number; prices: number[] }>();
  for (const r of rows) {
    if (!r.city) continue;
    const c = byCity.get(r.city) ?? { n: 0, recent: 0, prices: [] };
    c.n += 1;
    if (r.published_at && new Date(r.published_at) > monthAgo) c.recent += 1;
    if (r.price_from_public) c.prices.push(r.price_from_public);
    byCity.set(r.city, c);
  }
  const top = [...byCity.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  const lines = top.map(([city, c]) => {
    const min = c.prices.length ? Math.min(...c.prices) : null;
    return `- ${city}: ${c.n} active listed projects on LIQWD (${c.recent} newly listed in the last 30 days)${min ? `, starting prices from $${Math.round(min).toLocaleString("en-CA")}` : ""}`;
  });
  return `LIQWD live-inventory stats as of ${new Date().toISOString().slice(0, 10)} (these are OUR OWN platform numbers — attribute them to LIQWD's tracked inventory, not the whole market):\n${lines.join("\n")}`;
}

const NOTE_TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 4 },
  {
    name: "emit_article",
    description: "Return the finished article draft. Call exactly once, last.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "45-70 chars, specific" },
        slug: {
          type: "string",
          description:
            "lowercase-hyphenated, include the month and year (e.g. ontario-new-construction-notes-august-2026)",
        },
        excerpt: { type: "string", description: "<= 220 chars standfirst" },
        body_md: {
          type: "string",
          description:
            "Markdown body ending with a '## Sources' section listing the news URLs used",
        },
        seo_title: { type: "string", description: "<= 60 chars" },
        seo_meta_description: { type: "string", description: "140-160 chars" },
      },
      required: [
        "title",
        "slug",
        "excerpt",
        "body_md",
        "seo_title",
        "seo_meta_description",
      ],
    },
  },
];

/**
 * Drafts the daily market note: our inventory stats + web-searched Ontario
 * new-construction news, every external fact cited. Returns the inserted
 * article id, or null on any failure (cron reports it; nothing throws).
 */
async function generateMarketNote(admin: Admin): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const stats = await inventoryStats(admin);

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content:
        "Write today's short market note for LIQWD's Insights blog (readers: Ontario " +
        "pre-construction buyers and investors). 450-700 words, markdown (## / ###), " +
        "clear and specific, no hype, no forecasts, never promise returns.\n\n" +
        "GROUND RULES:\n" +
        "1. Use web_search (up to 4 searches) for THIS WEEK's Ontario new-construction / " +
        "pre-construction housing news: project launches, government housing policy, CMHC " +
        "data releases, interest-rate decisions affecting buyers. Skip anything you cannot " +
        "attribute to a source; no speculation.\n" +
        "2. Weave in the LIQWD inventory stats below where relevant, attributed as our " +
        "platform's tracked inventory.\n" +
        "3. Every external fact must come from a search result. End the body with a " +
        "'## Sources' section listing the URLs used.\n" +
        "4. No invented numbers, no unnamed 'experts', no 'sources say'.\n\n" +
        `${stats}\n\nWhen done, call emit_article exactly once.`,
    },
  ];

  try {
    const client = new Anthropic();
    for (let round = 0; round < 4; round++) {
      const res = await client.messages.create(
        {
          model: "claude-sonnet-5",
          max_tokens: 4000,
          // Later rounds resend the search-heavy conversation — cache it.
          cache_control: { type: "ephemeral" },
          tools: NOTE_TOOLS,
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
        const slug = str("slug")
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 120);
        if (!str("title") || slug.length < 3 || !str("body_md")) return null;
        return insertReviewDraft(admin, {
          slug,
          article_type: "market_update",
          title: str("title"),
          excerpt: str("excerpt") || null,
          body_md: str("body_md"),
          seo_title: str("seo_title") || null,
          seo_meta_description: str("seo_meta_description") || null,
          related_project_ids: [],
        });
      }

      if (res.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      if (round === 0) {
        messages.push({ role: "assistant", content: res.content });
        messages.push({
          role: "user",
          content: "Call emit_article now with the finished note.",
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

/** Leave headroom under the route's maxDuration=300 for the last DB writes. */
const RUN_BUDGET_MS = 270_000;

/** The cron body. Never throws; the route reports the result. */
export async function runDailyContent(admin: Admin): Promise<DailyContentResult> {
  const startedAt = Date.now();
  const result: DailyContentResult = {
    spotlight: null,
    marketNote: null,
    comparison: null,
    brokeragePiece: null,
    published: 0,
    heldForReview: 0,
    skipped: [],
    queued: 0,
  };

  // Editor-in-chief finishing move: hero + edit + publish-or-hold. Skipped
  // (piece stays safely in the review queue) when the run is out of time —
  // the gate fails closed, never open.
  const finish = async (id: string | null) => {
    if (!id) return;
    if (Date.now() - startedAt > RUN_BUDGET_MS) {
      result.heldForReview += 1;
      result.skipped.push("editor pass skipped (out of time) — piece held for review");
      return;
    }
    const status = await finishAndPublish(admin, id);
    if (status === "published") result.published += 1;
    else result.heldForReview += 1;
  };

  let queued = await unreviewedCount(admin);
  if (queued >= QUEUE_CAP) {
    result.skipped.push(
      `queue full (${queued} unreviewed >= cap ${QUEUE_CAP}) — review before more drafts generate`,
    );
    result.queued = queued;
    return result;
  }

  // 1. Project of the day.
  const projectId = await pickSpotlightProject(admin);
  if (!projectId) {
    result.skipped.push("spotlight: every eligible project already covered");
  } else {
    const draft = await generateArticleDraft(
      "project_spotlight",
      [projectId],
      admin,
    );
    if (draft) {
      result.spotlight = await insertReviewDraft(admin, {
        ...draft,
        article_type: "project_spotlight",
        excerpt: draft.excerpt || null,
        seo_title: draft.seo_title || null,
        seo_meta_description: draft.seo_meta_description || null,
      });
      if (result.spotlight) queued += 1;
    }
    if (!result.spotlight) result.skipped.push("spotlight: generation failed");
    await finish(result.spotlight);
  }

  // 2. Market note — MONTHLY, timed to land after TRREB's Market Watch
  // release (founder call 2026-08-11: daily market notes were overkill; one
  // per month, citing fresh stats, beats thirty thin ones).
  if (queued >= QUEUE_CAP) {
    result.skipped.push("market note: queue at cap");
  } else if (await marketNoteDue(admin)) {
    result.marketNote = await generateMarketNote(admin);
    if (result.marketNote) queued += 1;
    else result.skipped.push("market note: generation failed");
    await finish(result.marketNote);
  } else {
    result.skipped.push("market note: not due (monthly cadence)");
  }

  // 3. Second post of the day — the cadence is TWO posts/day: the spotlight
  // above plus one of these, weighted toward project comparisons. Even UTC
  // days try a comparison first and fall back to the positioned backlog
  // (brokerage/platform/toolkit/consumer); odd days the reverse. When the
  // backlog is exhausted this slot becomes comparisons every day.
  if (queued >= QUEUE_CAP) {
    result.skipped.push("second post: queue at cap");
  } else if (Date.now() - startedAt > 150_000) {
    result.skipped.push("second post: out of time — tomorrow");
  } else {
    const preferComparison = new Date().getUTCDate() % 2 === 0;
    const tryComparison = async () => {
      result.comparison = await generateComparisonPiece(admin);
      if (result.comparison) {
        queued += 1;
        await finish(result.comparison);
        return true;
      }
      return false;
    };
    const tryBacklog = async () => {
      const [next] = await nextUncoveredPieces(admin, 1);
      if (!next) return false;
      const id = await generateBrokeragePiece(admin, next.kind, next.names);
      if (id) {
        result.brokeragePiece = id;
        queued += 1;
        await finish(id);
        return true;
      }
      result.skipped.push(
        `backlog piece (${next.names.join(" vs ")}): generation failed or nothing corroborated`,
      );
      return false;
    };
    const done = preferComparison
      ? (await tryComparison()) || (await tryBacklog())
      : (await tryBacklog()) || (await tryComparison());
    if (!done) result.skipped.push("second post: nothing available to generate");
  }

  result.queued = queued;

  // Morning ops digest — what went live, what the editor held. Fire-and-forget.
  if (result.published + result.heldForReview > 0) {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
    const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
    const held = result.heldForReview;
    void sendEmail({
      to,
      subject:
        held > 0
          ? `Insights: ${result.published} published, ${held} held for your review`
          : `Insights: ${result.published} article${result.published === 1 ? "" : "s"} published`,
      html: brandedEmail({
        heading: "Today's content run",
        body:
          `The pipeline published ${result.published} article${result.published === 1 ? "" : "s"} ` +
          `(each passed the editor-in-chief gate). ` +
          (held > 0
            ? `${held} piece${held === 1 ? " was" : "s were"} HELD — the editor flagged something a human should check; its notes are on each draft.`
            : "Nothing was held back."),
        ctaUrl: held > 0 ? `${base}/dashboard/admin/articles` : `${base}/insights`,
        ctaLabel: held > 0 ? "Review held drafts" : "See what's live",
      }),
    });
  }

  return result;
}

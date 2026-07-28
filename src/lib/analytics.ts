import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * First-party, privacy-safe page analytics (migration 0079). Server-side
 * only — no tracking script, no cookies, no raw IP/UA ever stored. The
 * session hash is salted and includes the UTC date, so visitors are
 * unlinkable across days. Writes go through the service role AFTER the
 * response is sent (`after()`), and every failure is swallowed: analytics
 * must never slow down or break a public page.
 */

export type PageEventType = "page_view" | "lead_submit";
export type PageType = "project" | "article" | "agent_profile";

export interface PageEventTarget {
  publicProjectPageId?: string | null;
  articleId?: string | null;
  agentProfileId?: string | null;
  utm?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
  };
}

// Tolerant of Next's searchParams shapes (string | string[] | undefined).
const clip = (v: unknown, max = 120): string | null => {
  const s =
    typeof v === "string"
      ? v.trim()
      : Array.isArray(v)
        ? String(v[0] ?? "").trim()
        : "";
  return s ? s.slice(0, max) : null;
};

/**
 * Records one event. Call from a server component render or a server action
 * (request scope — it reads request headers). Fire-and-forget: awaiting it
 * only waits for header reads, never for the database write.
 */
export async function recordPageEvent(
  eventType: PageEventType,
  pageType: PageType,
  target: PageEventTarget,
): Promise<void> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const h = await headers();

    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const ua = h.get("user-agent") ?? "";
    const day = new Date().toISOString().slice(0, 10);
    const salt =
      process.env.ANALYTICS_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sessionHash = createHash("sha256")
      .update(`${ip}|${ua}|${day}|${salt}`)
      .digest("hex")
      .slice(0, 32);

    // External referrer hostname only — same-site navigation isn't a referral.
    let referrerHost: string | null = null;
    try {
      const referer = h.get("referer");
      if (referer) {
        const host = new URL(referer).hostname;
        const own = new URL(
          process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca",
        ).hostname;
        if (host && host !== own) referrerHost = clip(host);
      }
    } catch {
      // Malformed referer — skip it.
    }

    const row = {
      event_type: eventType,
      page_type: pageType,
      public_project_page_id: target.publicProjectPageId || null,
      article_id: target.articleId || null,
      agent_profile_id: target.agentProfileId || null,
      session_hash: sessionHash,
      referrer_host: referrerHost,
      utm_source: clip(target.utm?.source),
      utm_medium: clip(target.utm?.medium),
      utm_campaign: clip(target.utm?.campaign),
    };

    after(async () => {
      try {
        await createAdminClient().from("page_events").insert(row);
      } catch {
        // Analytics never surfaces errors.
      }
    });
  } catch {
    // Called outside request scope, or headers unavailable — drop the event.
  }
}

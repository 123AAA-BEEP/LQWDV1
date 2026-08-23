import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  vercelDomainsConfigured,
  autoBuyMaxUsd,
  ensureDomainServing,
} from "@/lib/vercel-domains";
import { sendEmail, brandedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Self-healing domain cron (hourly via vercel.json — Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`).
 *
 * Every live microsite's domain gets run through the same
 * check-buy-attach-verify pipeline as Set live and the Buy button:
 * attach both hosts, ENFORCE apex-serves routing (clearing the
 * dashboard's apex→www redirect that looped echotownswaterdown.com),
 * and — only when MICROSITE_AUTO_BUY_MAX_USD is set — buy an
 * unregistered domain at or under the cap. So a misconfigured or
 * hand-connected domain fixes itself within the hour, with no admin
 * click. Ops gets an email only when money was actually spent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!vercelDomainsConfigured()) {
    return NextResponse.json({ skipped: "Vercel env not configured" });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("microsite_configs")
    .select("id, domain")
    .eq("status", "live")
    .order("updated_at", { ascending: false })
    .limit(25);
  const sites = (data as { id: string; domain: string }[] | null) ?? [];

  const cap = autoBuyMaxUsd();
  const results: { domain: string; state: string; detail: string }[] = [];
  for (const site of sites) {
    const r = await ensureDomainServing(site.domain, cap);
    results.push({ domain: site.domain, state: r.state, detail: r.detail });
    if (r.state === "bought") {
      try {
        await sendEmail({
          to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
          subject: `Domain bought: ${site.domain} (US$${r.price})`,
          html: brandedEmail({
            heading: `Domain bought: ${site.domain}`,
            body: `The domain-heal cron registered ${site.domain} for US$${r.price} (it was live but unregistered) and attached both hosts.`,
            ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"}/dashboard/admin/microsites/${site.id}`,
            ctaLabel: "Open the microsite",
            footnote: "LIQWD internal notification.",
          }),
        });
      } catch {
        /* the heal never fails on a ping */
      }
    }
  }

  return NextResponse.json({ checked: results.length, results });
}

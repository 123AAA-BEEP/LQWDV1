import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseMicrositeDirective,
  domainCandidates,
  type MicrositeConfig,
} from "@/lib/microsites";
import {
  vercelDomainsConfigured,
  autoBuyMaxUsd,
  checkDomain,
  buyDomain,
  attachDomainToProject,
} from "@/lib/vercel-domains";
import { sendEmail, brandedEmail } from "@/lib/email";

/**
 * Email-triggered microsite spin-up. When a forwarded intake email carries a
 * founder directive — "microsite: echotownswaterdown.com" (or a bare
 * "microsite" mention) — this runs AFTER the project ingest and:
 *
 *   1. creates the microsite config (draft) when a domain was named;
 *   2. generates the page content immediately when the project is publicly
 *      visible (published), so review is one click away;
 *   3. optionally BUYS + attaches the domain — only when the domain was in
 *      the SUBJECT line (founder-typed, not marketing copy), Vercel env is
 *      configured, AND the price is at or under MICROSITE_AUTO_BUY_MAX_USD;
 *   4. always emails ops what happened + the admin link. Going live stays a
 *      human decision in Admin → Microsites.
 *
 * Returns a short note for the intake log, or null when no directive found.
 */
export async function handleMicrositeDirective(opts: {
  subject: string | null;
  text: string | null;
  projectId: string | null;
  projectName: string | null;
  city: string | null;
}): Promise<string | null> {
  const d = parseMicrositeDirective(opts.subject, opts.text);
  if (!d.requested) return null;

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const listUrl = `${base}/dashboard/admin/microsites`;

  if (!opts.projectId) {
    await ping(
      "Microsite requested — but no project came out of this email",
      "The intake couldn't create or match a project, so there's nothing to ground a microsite in. Fix the project first, then create the microsite from the admin.",
      listUrl,
      "Open Microsites",
    );
    return "microsite: requested, no project to attach";
  }

  if (!d.domain) {
    const ideas = opts.projectName
      ? domainCandidates(opts.projectName, opts.city, "ca", 0)
      : [];
    await ping(
      "Microsite requested — pick a domain",
      `No domain was named in the email. Suggested candidates: ${
        ideas.length ? ideas.join(", ") : "(none — name it after the project)"
      }. Buy one (or let the admin screen buy it), then create the microsite.`,
      listUrl,
      "Create the microsite",
    );
    return "microsite: requested without a domain (ping sent)";
  }

  const admin = createAdminClient();
  const notes: string[] = [];

  // Create-or-reuse the config keyed by domain.
  await admin
    .from("microsite_configs")
    .upsert(
      { domain: d.domain, project_id: opts.projectId },
      { onConflict: "domain", ignoreDuplicates: true },
    );
  const { data } = await admin
    .from("microsite_configs")
    .select("id, domain, project_id, skin, status, context, content, capture_key")
    .eq("domain", d.domain)
    .maybeSingle();
  const config = (data as MicrositeConfig | null) ?? null;
  if (!config) {
    await ping(
      `Microsite for ${d.domain} — config creation failed`,
      "The insert didn't land; create it manually.",
      listUrl,
      "Open Microsites",
    );
    return `microsite: ${d.domain} config creation failed`;
  }
  const detailUrl = `${listUrl}/${config.id}`;
  notes.push(`config ${config.status}`);

  // Seed the positioning context with the email's links (builder page,
  // sales page) so generation fetches them as SOURCE MATERIAL without the
  // founder having to re-paste anything. Never overwrites existing URLs.
  const emailUrls = [
    ...new Set(opts.text?.match(/https?:\/\/[^\s"'>)]+/g) ?? []),
  ]
    .filter((u) => !u.includes(config.domain))
    .slice(0, 2);
  if (emailUrls.length && !/https?:\/\//.test(JSON.stringify(config.context ?? {}))) {
    config.context = { ...(config.context ?? {}), source_urls: emailUrls };
    await admin
      .from("microsite_configs")
      .update({ context: config.context, updated_at: new Date().toISOString() })
      .eq("id", config.id);
    notes.push("context seeded with email links");
  }

  // Generation is deliberately NOT run here: the intake route has a 60s
  // budget (Hobby plan) and a full page build (hero + 12 sections + 4
  // sub-pages + brand vision) would blow it and get killed mid-flight.
  // The config lands ready; the founder's first Generate click in admin
  // builds the page, right where context and photos get added anyway.

  // Unattended domain purchase — three explicit gates (subject-line domain,
  // Vercel env, price cap) so a stray word in marketing copy can never spend.
  let domainLine = "Domain: buy it, then attach it to the Vercel project (or use the Buy button on the microsite screen).";
  const cap = autoBuyMaxUsd();
  if (d.domainInSubject && cap > 0 && vercelDomainsConfigured()) {
    const check = await checkDomain(d.domain);
    if (check && !check.available) {
      const attached = await attachDomainToProject(d.domain);
      domainLine = attached.ok
        ? "Domain: already registered — attached to the Vercel project."
        : "Domain: already registered (attach it in Vercel if you own it).";
      notes.push("domain already registered");
    } else if (check?.available && check.price != null && check.price <= cap) {
      const bought = await buyDomain(d.domain, check.price);
      if (bought.ok) {
        const attached = await attachDomainToProject(d.domain);
        domainLine = `Domain: bought for US$${check.price}${attached.ok ? " and attached to the Vercel project" : " — attach it in Vercel (auto-attach failed)"}.`;
        notes.push(`domain bought US$${check.price}`);
      } else {
        domainLine = `Domain: purchase failed (${bought.error}) — buy it manually.`;
        notes.push("domain purchase failed");
      }
    } else if (check?.available && check.price != null) {
      domainLine = `Domain: available at US$${check.price} — over the US$${cap} auto-buy cap, so it needs your click.`;
      notes.push("domain over auto-buy cap");
    }
  }

  await ping(
    `Microsite created: ${d.domain} — add context and hit Generate`,
    `${notes.join("; ")}. ${domainLine} Review the content, then Set live.`,
    detailUrl,
    "Review the microsite",
  );
  return `microsite: ${d.domain} — ${notes.join("; ")}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ping(
  heading: string,
  body: string,
  ctaUrl: string,
  ctaLabel: string,
) {
  try {
    await sendEmail({
      to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
      subject: heading,
      html: brandedEmail({
        heading,
        body: esc(body),
        ctaUrl,
        ctaLabel,
        footnote: "LIQWD internal notification.",
      }),
    });
  } catch {
    /* the pipeline never fails on a ping */
  }
}

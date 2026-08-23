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
  ensureDomainServing,
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

  // A microsite REQUIRES its project in the public view (facts, imagery,
  // lead routing all read it). Ingest can leave a published project's page
  // disabled or inactive (e.g. no hero passed the quality gate) — an
  // explicit microsite request overrides that so Generate never dead-ends
  // on "project not publicly visible" (the Bridgelands failure mode).
  const { data: proj } = await admin
    .from("projects")
    .select("id, record_status, public_page_enabled")
    .eq("id", config.project_id)
    .maybeSingle();
  if (proj?.record_status === "published") {
    if (!proj.public_page_enabled) {
      await admin
        .from("projects")
        .update({ public_page_enabled: true })
        .eq("id", proj.id);
    }
    const { data: activated } = await admin
      .from("public_project_pages")
      .update({ is_active: true })
      .eq("project_id", proj.id)
      .eq("is_active", false)
      .select("id");
    if (!proj.public_page_enabled || activated?.length) {
      notes.push("public page activated for the microsite");
    }
  }

  // Seed the positioning context with the email's links (builder page,
  // sales page) so generation fetches them as SOURCE MATERIAL without the
  // founder having to re-paste anything. Never overwrites existing URLs.
  const emailUrls = [
    ...new Set(opts.text?.match(/https?:\/\/[^\s"'>)]+/g) ?? []),
  ]
    .filter((u) => !u.includes(config.domain))
    // Pages only — asset files (renderings, tracking pixels, PDFs) carry no
    // prose for the generator to weave.
    .filter((u) => !/\.(png|jpe?g|gif|webp|svg|ico|pdf|css|js)(\?|$)/i.test(u))
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
  // Inside the gates it runs the SAME check-buy-attach-verify pipeline as
  // Set live and the Buy button (apex + www, success only off `verified`).
  let domainLine =
    "Domain: NOT auto-bought (set MICROSITE_AUTO_BUY_MAX_USD in Vercel env, or use the Buy button on the microsite screen). The URL will not load until it's registered.";
  const cap = autoBuyMaxUsd();
  if (d.domainInSubject && cap > 0 && vercelDomainsConfigured()) {
    const ensured = await ensureDomainServing(d.domain, cap);
    domainLine = `Domain: ${ensured.detail}`;
    notes.push(`domain ${ensured.state}${ensured.price != null ? ` US$${ensured.price}` : ""}`);
  } else if (!d.domainInSubject) {
    domainLine =
      "Domain: auto-buy skipped — the domain wasn't in the SUBJECT line (only founder-typed subjects can spend). Buy it from the microsite screen.";
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

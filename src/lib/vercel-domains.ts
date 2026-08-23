import "server-only";

/**
 * Thin Vercel Domains API wrapper for the microsite rail: availability/price
 * check, purchase, and attach-to-project. Everything is opt-in via env —
 * with no VERCEL_TOKEN the app behaves exactly as before (manual attach in
 * the Vercel dashboard).
 *
 *   VERCEL_TOKEN               account/team API token (Vercel → Settings → Tokens)
 *   VERCEL_PROJECT_ID          the LIQWD project's id (Project → Settings → General)
 *   VERCEL_TEAM_ID             optional — only when the project lives in a team
 *   MICROSITE_AUTO_BUY_MAX_USD optional — enables UNATTENDED purchase from the
 *                              email-intake directive, capped at this price.
 *                              Unset = purchases always need an admin click.
 *
 * Purchases bill the Vercel account's payment method; `expectedPrice` is
 * always passed so a listing-price change fails the buy instead of
 * overspending.
 */

const API = "https://api.vercel.com";

function env() {
  const token = process.env.VERCEL_TOKEN ?? "";
  const projectId = process.env.VERCEL_PROJECT_ID ?? "";
  const teamId = process.env.VERCEL_TEAM_ID ?? "";
  return { token, projectId, teamId };
}

export function vercelDomainsConfigured(): boolean {
  const { token, projectId } = env();
  return Boolean(token && projectId);
}

/** Founder rule: no domain purchase over this, ever (one-click or unattended). */
export const DOMAIN_MAX_USD = 15;

/** Unattended-purchase cap in USD; 0 = auto-buy disabled. Never above the hard cap. */
export function autoBuyMaxUsd(): number {
  const n = Number(process.env.MICROSITE_AUTO_BUY_MAX_USD ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, DOMAIN_MAX_USD) : 0;
}

async function call(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { token, teamId } = env();
  const url = new URL(`${API}${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(8000),
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* some endpoints return empty bodies */
  }
  return { status: res.status, body };
}

const errMessage = (body: Record<string, unknown>): string => {
  const e = body.error as { message?: string; code?: string } | undefined;
  return e?.message ?? e?.code ?? "Vercel API error";
};

export interface DomainCheck {
  available: boolean;
  /** USD; null when Vercel doesn't sell this TLD or the check failed. */
  price: number | null;
}

/** Availability + first-year price. Returns null when the API is unreachable. */
export async function checkDomain(domain: string): Promise<DomainCheck | null> {
  if (!vercelDomainsConfigured()) return null;
  try {
    const status = await call(`/v4/domains/status?name=${encodeURIComponent(domain)}`);
    if (status.status !== 200) return null;
    const available = Boolean(status.body.available);
    if (!available) return { available: false, price: null };
    const price = await call(`/v4/domains/price?name=${encodeURIComponent(domain)}`);
    const p = Number(price.body.price);
    return { available: true, price: Number.isFinite(p) ? p : null };
  } catch {
    return null;
  }
}

/** Buys the domain at exactly `expectedPrice` (auto-renew on). */
export async function buyDomain(
  domain: string,
  expectedPrice: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!vercelDomainsConfigured()) return { ok: false, error: "Vercel not configured" };
  try {
    const res = await call(`/v5/domains/buy`, {
      method: "POST",
      body: JSON.stringify({ name: domain, expectedPrice, renew: true }),
    });
    if (res.status === 200 || res.status === 201) return { ok: true };
    return { ok: false, error: errMessage(res.body) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

async function addDomain(
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const { projectId } = env();
  try {
    const res = await call(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.status === 200 || res.status === 201) return { ok: true };
    if (res.status === 409) return { ok: true }; // already attached
    return { ok: false, error: errMessage(res.body) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

/**
 * Points the domain at the LIQWD Vercel project — BOTH hosts:
 *   apex   (mybridgelands.com)        → serves the site
 *   www.*  (www.mybridgelands.com)    → 308 redirect to the apex
 *
 * Attaching www matters twice over: without it the www address simply
 * fails to resolve for anyone who types it, and if it resolved without the
 * redirect we'd serve the same page on two hosts (duplicate content). One
 * canonical host, one redirect. Already-attached = ok.
 */
export async function attachDomainToProject(
  domain: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!vercelDomainsConfigured()) return { ok: false, error: "Vercel not configured" };

  const apex = await addDomain({ name: domain });
  if (!apex.ok) return apex;

  // Best effort: a www failure must not block the apex going live.
  const www = await addDomain({
    name: `www.${domain}`,
    redirect: domain,
    redirectStatusCode: 308,
  });
  if (!www.ok) {
    return { ok: true, error: `www not attached (${www.error})` };
  }
  return { ok: true };
}

export interface DomainEnsure {
  /**
   * serving   — registered, attached (apex + www), verified: the URL loads.
   * bought    — we just registered it (≤ maxUsd) and attached both hosts.
   * over_cap  — available but above maxUsd: needs a human decision.
   * needs_dns — registered (maybe elsewhere) but Vercel can't verify it yet.
   * failed    — purchase or attach failed, or the TLD isn't sold by Vercel.
   * unknown   — Vercel env missing or the API was unreachable.
   */
  state: "serving" | "bought" | "over_cap" | "needs_dns" | "failed" | "unknown";
  price: number | null;
  /** One human sentence — safe to show in a flash message or intake note. */
  detail: string;
}

/**
 * The one entry point for "make {domain} actually load" — used by Set live,
 * the Buy button, and the email-intake directive so every path behaves the
 * same. Checks registration, BUYS when available at or under `maxUsd`,
 * attaches BOTH hosts (apex + www 308), and only ever reports success off
 * Vercel's `verified` flag. Born from the mybridgelands/liveatfiveoaks
 * failure: a site marked live while the domain was never registered, so the
 * URL died with NXDOMAIN while everything looked green.
 */
export async function ensureDomainServing(
  domain: string,
  maxUsd: number = DOMAIN_MAX_USD,
): Promise<DomainEnsure> {
  if (!vercelDomainsConfigured()) {
    return {
      state: "unknown",
      price: null,
      detail:
        "Vercel env not configured (VERCEL_TOKEN / VERCEL_PROJECT_ID) — buy and attach the domain in the Vercel dashboard.",
    };
  }

  // Already serving (registered + DNS answers)? Still re-run attach: it's
  // idempotent and guarantees the www host + 308 exist even on domains
  // attached by hand.
  const before = await getDomainStatus(domain);
  if (before?.serving) {
    const att = await attachDomainToProject(domain);
    return {
      state: "serving",
      price: null,
      detail: att.error
        ? `${domain} is registered and serving (${att.error}).`
        : `${domain} and www.${domain} are registered, attached, and serving.`,
    };
  }

  const check = await checkDomain(domain);
  if (!check) {
    return {
      state: "unknown",
      price: null,
      detail: "Couldn't reach the Vercel domains API — check again in a minute.",
    };
  }

  if (check.available) {
    if (check.price == null) {
      return {
        state: "failed",
        price: null,
        detail: `Vercel doesn't sell this TLD — register ${domain} elsewhere, then attach it.`,
      };
    }
    if (check.price > maxUsd) {
      return {
        state: "over_cap",
        price: check.price,
        detail: `${domain} is unregistered — available at US$${check.price}/yr, over the US$${maxUsd} cap, so it needs your click (or a cheaper name).`,
      };
    }
    const bought = await buyDomain(domain, check.price);
    if (!bought.ok) {
      return {
        state: "failed",
        price: check.price,
        detail: `Purchase failed (${bought.error}) — buy ${domain} manually.`,
      };
    }
    const att = await attachDomainToProject(domain);
    return {
      state: "bought",
      price: check.price,
      detail: att.ok
        ? `Bought ${domain} for US$${check.price} and attached it plus www${att.error ? ` (${att.error})` : ""}.`
        : `Bought ${domain} for US$${check.price} — attach failed (${att.error}); attach it in Vercel.`,
    };
  }

  // Registered — by us on another project, or by someone else. Attach and
  // let the config check decide; never report success without DNS answering.
  const att = await attachDomainToProject(domain);
  if (!att.ok) {
    return {
      state: "failed",
      price: null,
      detail: `${domain} is registered but attach failed (${att.error}).`,
    };
  }
  const after = await getDomainStatus(domain);
  if (after?.serving) {
    return {
      state: "serving",
      price: null,
      detail: `${domain} and www.${domain} are attached and serving.`,
    };
  }
  return {
    state: "needs_dns",
    price: null,
    detail: after?.owned
      ? `${domain} is registered on the Vercel account and attached, but DNS isn't answering yet — usually just propagation; give it up to an hour.`
      : `${domain} is registered by someone else — if it's yours, point its DNS at Vercel; if not, pick another name.`,
  };
}

export interface DomainStatus {
  /** Listed on the Vercel project (possible even for a domain we don't own). */
  attached: boolean;
  /** Registered on THIS Vercel account (the registrar actually has it). */
  owned: boolean;
  /** Attached AND DNS answers — the only state where the URL loads. */
  serving: boolean;
}

/**
 * The truth about a domain, from the endpoints that can't lie. Two flags
 * that DON'T mean what they sound like: project-domain `verified: true`
 * only means no OTHER Vercel account claims the name — it is true for a
 * domain nobody has ever registered (the liveatfiveoaks.ca green-card
 * bug), so it is deliberately not read here. Instead:
 *   owned   — GET /v5/domains/{name}: 200 only when this account
 *             registered it.
 *   serving — GET /v6/domains/{name}/config: misconfigured === false,
 *             i.e. DNS genuinely resolves to Vercel.
 * null = couldn't tell (no token / API trouble).
 */
export async function getDomainStatus(
  domain: string,
): Promise<DomainStatus | null> {
  const { projectId } = env();
  if (!vercelDomainsConfigured()) return null;
  try {
    const proj = await call(
      `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
    );
    if (proj.status !== 200 && proj.status !== 404) return null;
    const attached = proj.status === 200;
    const reg = await call(`/v5/domains/${encodeURIComponent(domain)}`);
    const owned = reg.status === 200;
    let serving = false;
    if (attached) {
      const cfg = await call(`/v6/domains/${encodeURIComponent(domain)}/config`);
      serving = cfg.status === 200 && cfg.body.misconfigured === false;
    }
    return { attached, owned, serving };
  } catch {
    return null;
  }
}

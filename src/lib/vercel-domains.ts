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

/** Points the domain at the LIQWD Vercel project. Already-attached = ok. */
export async function attachDomainToProject(
  domain: string,
): Promise<{ ok: boolean; error?: string }> {
  const { projectId } = env();
  if (!vercelDomainsConfigured()) return { ok: false, error: "Vercel not configured" };
  try {
    const res = await call(`/v10/projects/${encodeURIComponent(projectId)}/domains`, {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    });
    if (res.status === 200 || res.status === 201) return { ok: true };
    if (res.status === 409) return { ok: true }; // already attached
    return { ok: false, error: errMessage(res.body) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}

export interface DomainStatus {
  /** Listed on the Vercel project (possible even for a domain we don't own). */
  attached: boolean;
  /** Vercel has confirmed ownership + DNS. Only then does the site load. */
  verified: boolean;
}

/**
 * Attachment AND verification. The distinction matters: Vercel happily
 * accepts a domain nobody owns, leaving it attached-but-unverified — the
 * URL then dies with NXDOMAIN. Never report "DNS is handled" off
 * attachment alone. null = couldn't tell (no token / API trouble).
 */
export async function getDomainStatus(
  domain: string,
): Promise<DomainStatus | null> {
  const { projectId } = env();
  if (!vercelDomainsConfigured()) return null;
  try {
    const res = await call(
      `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}`,
    );
    if (res.status === 404) return { attached: false, verified: false };
    if (res.status !== 200) return null;
    return { attached: true, verified: res.body.verified === true };
  } catch {
    return null;
  }
}

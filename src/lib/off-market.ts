/** Off-market claim helpers (shared by the board, detail, and claim pages). */

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/** The public claim link an admin sends to a listing's agent. */
export function claimUrlFor(token: string): string {
  return `${SITE_URL}/claim/${token}`;
}

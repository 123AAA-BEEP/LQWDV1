/**
 * Buyer-tool math — pure functions + the rate tables they're derived from.
 * Rates are stable, well-known public facts (Ontario LTT, Toronto MLTT,
 * GST/HST new-housing rebates). Tables are exported so tool pages render them
 * as visible HTML: the tables themselves are ranking content, and showing the
 * math builds trust. Every tool page carries a "verify with your lawyer /
 * accountant" disclaimer — these are estimates, not advice.
 */

export interface Bracket {
  upTo: number | null; // null = no ceiling
  rate: number;
}

/** Ontario Land Transfer Tax — marginal brackets (1–2 single-family residences). */
export const ONTARIO_LTT: Bracket[] = [
  { upTo: 55_000, rate: 0.005 },
  { upTo: 250_000, rate: 0.01 },
  { upTo: 400_000, rate: 0.015 },
  { upTo: 2_000_000, rate: 0.02 },
  { upTo: null, rate: 0.025 },
];

/** Toronto Municipal Land Transfer Tax — includes the 2024 graduated luxury tiers. */
export const TORONTO_MLTT: Bracket[] = [
  { upTo: 55_000, rate: 0.005 },
  { upTo: 250_000, rate: 0.01 },
  { upTo: 400_000, rate: 0.015 },
  { upTo: 2_000_000, rate: 0.02 },
  { upTo: 3_000_000, rate: 0.025 },
  { upTo: 4_000_000, rate: 0.035 },
  { upTo: 5_000_000, rate: 0.045 },
  { upTo: 10_000_000, rate: 0.055 },
  { upTo: 20_000_000, rate: 0.065 },
  { upTo: null, rate: 0.075 },
];

/** First-time-buyer rebate maximums. */
export const ONTARIO_FTB_REBATE_MAX = 4_000;
export const TORONTO_FTB_REBATE_MAX = 4_475;

/** Marginal-bracket tax on a price. */
export function bracketTax(price: number, brackets: Bracket[]): number {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const ceil = b.upTo ?? Infinity;
    if (price <= prev) break;
    const slice = Math.min(price, ceil) - prev;
    tax += slice * b.rate;
    prev = ceil;
  }
  return Math.round(tax * 100) / 100;
}

export interface LttResult {
  ontario: number;
  toronto: number; // 0 when not in Toronto
  total: number;
  ontarioRebate: number;
  torontoRebate: number;
  net: number;
}

export function calcLtt(
  price: number,
  opts: { inToronto: boolean; firstTimeBuyer: boolean },
): LttResult {
  const ontario = bracketTax(price, ONTARIO_LTT);
  const toronto = opts.inToronto ? bracketTax(price, TORONTO_MLTT) : 0;
  const ontarioRebate = opts.firstTimeBuyer
    ? Math.min(ontario, ONTARIO_FTB_REBATE_MAX)
    : 0;
  const torontoRebate =
    opts.firstTimeBuyer && opts.inToronto
      ? Math.min(toronto, TORONTO_FTB_REBATE_MAX)
      : 0;
  const total = ontario + toronto;
  return {
    ontario,
    toronto,
    total,
    ontarioRebate,
    torontoRebate,
    net: Math.max(0, total - ontarioRebate - torontoRebate),
  };
}

export interface HstRebateResult {
  hst: number; // 13% of base
  federalRebate: number;
  ontarioRebate: number;
  totalRebate: number;
  netHst: number;
}

/**
 * GST/HST New Housing Rebate estimate for an Ontario new home used as a
 * primary residence. Base price is the pre-HST consideration.
 *  - Federal: 36% of the 5% GST, max $6,300; phases out linearly between
 *    $350K and $450K; $0 at $450K+.
 *  - Ontario: 75% of the 8% provincial portion, capped at $24,000 (reached
 *    at $400K; no phase-out above).
 */
export function calcHstRebate(base: number): HstRebateResult {
  const hst = base * 0.13;
  let federal = 0;
  if (base <= 350_000) {
    federal = Math.min(6_300, 0.36 * 0.05 * base);
  } else if (base < 450_000) {
    federal = (6_300 * (450_000 - base)) / 100_000;
  }
  const ontario = Math.min(24_000, 0.75 * 0.08 * base);
  const totalRebate = federal + ontario;
  return {
    hst: Math.round(hst * 100) / 100,
    federalRebate: Math.round(federal * 100) / 100,
    ontarioRebate: Math.round(ontario * 100) / 100,
    totalRebate: Math.round(totalRebate * 100) / 100,
    netHst: Math.round((hst - totalRebate) * 100) / 100,
  };
}

export interface DepositStage {
  label: string;
  pct: number;
}

/** Common GTA pre-construction deposit structures. Builders set their own —
 *  these are the patterns buyers most often see. */
export const DEPOSIT_PRESETS: { key: string; label: string; stages: DepositStage[] }[] = [
  {
    key: "20-extended",
    label: "20% extended (typical GTA condo)",
    stages: [
      { label: "With the offer / in 30 days", pct: 5 },
      { label: "In 90 days", pct: 5 },
      { label: "In 180 days", pct: 5 },
      { label: "In 370 days", pct: 5 },
    ],
  },
  {
    key: "15",
    label: "15% (three stages)",
    stages: [
      { label: "With the offer / in 30 days", pct: 5 },
      { label: "In 90 days", pct: 5 },
      { label: "In 365 days", pct: 5 },
    ],
  },
  {
    key: "10",
    label: "10% (incentive structure)",
    stages: [
      { label: "With the offer / in 30 days", pct: 5 },
      { label: "In 180 days", pct: 5 },
    ],
  },
  {
    key: "5-occupancy",
    label: "5% + 5% on occupancy",
    stages: [
      { label: "With the offer / in 30 days", pct: 5 },
      { label: "On interim occupancy", pct: 5 },
    ],
  },
];

export function money(n: number, currency: "CAD" | "USD" = "CAD"): string {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

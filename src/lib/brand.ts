/**
 * LIQWD brand + approved marketing copy.
 * Source of truth: liqwd_landing_page_copy.md / liqwd_master_build_brief.md.
 * Keep public copy within the documented guardrails (no MLS branding,
 * no implied RECO endorsement, outcome-focused).
 */
export const BRAND = {
  name: "LIQWD",
  tagline: "The Ultimate Broker Portal",
  subtagline: "For New Homes in Ontario",
  supportingLine: "Free for verified realtors. Built in Canada.",
} as const;

export const HERO = {
  headline: "The Ultimate Broker Portal",
  subheadline: "For New Homes in Ontario",
  supporting: "Free for verified realtors. Built in Canada.",
  body: "Access broker portals, track active new-home projects, and move faster on the opportunities that matter. LIQWD gives Ontario realtors one place to work through new-home inventory without bouncing between disconnected portals, scattered files, and outdated updates.",
  primaryCta: "Sign up free",
  secondaryCta: "Get verified",
} as const;

export const PROOF_POINTS = [
  "Free for realtors",
  "Made in Canada",
  "RECO verification required",
  "Built for Ontario brokers and agents",
] as const;

export const BENEFITS = [
  "Access broker portals in one place.",
  "View active projects through a cleaner, faster workflow.",
  "Spot where opportunities may exist on commissions, pricing, and incentives.",
  "Reduce time lost chasing scattered project details.",
  "Move faster with a portal built specifically for Ontario realtors.",
] as const;

export const VERIFICATION = {
  heading: "Verified broker-to-broker access",
  body: "LIQWD is built for real estate professionals. To keep the platform trusted and useful, access is reserved for verified Ontario realtors using RECO registration details.",
  bullets: [
    "Verify access using RECO registration details.",
    "Keep broker-only tools inside a trusted network.",
    "Access a platform built for real estate professionals, not the general public.",
  ],
} as const;

export const WHY = {
  heading: "Why realtors use LIQWD",
  body: "The value is simple: less friction, faster access, and a clearer path to the right project information. Instead of chasing updates across multiple broker portals, LIQWD helps realtors work from one organized workflow built around speed, clarity, and opportunity.",
  bullets: [
    "Save time.",
    "Stay organized.",
    "Find projects faster.",
    "Work from one portal instead of many.",
    "See the opportunities worth acting on.",
  ],
} as const;

export const SIGNUP_SECTION = {
  heading: "Get verified. Get access.",
  body: "Join LIQWD for free and unlock a better way to work through new-home opportunities in Ontario.",
} as const;

/**
 * Social-proof strip on the realtor landing. Framed as "agents from these
 * brokerages use LIQWD" — NOT brokerage endorsement (keeps within the
 * no-implied-endorsement guardrail). Drop real logo SVGs into
 * /public/brokerages and set `logo` to render them; otherwise a styled
 * wordmark of `name` is shown.
 */
export interface Brokerage {
  name: string;
  logo: string | null;
}

export const TRUST: { heading: string; brokerages: Brokerage[] } = {
  heading: "Trusted by agents from leading Canadian brokerages.",
  brokerages: [
    { name: "eXp Realty", logo: null },
    { name: "Royal LePage", logo: null },
    { name: "HomeLife", logo: null },
    { name: "RE/MAX", logo: null },
  ],
};

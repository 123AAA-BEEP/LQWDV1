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

/**
 * Hero visual — supplied skyline image plus a teal "glass" card rendered in
 * code (kept on-brand vs. the green used in the showcase images). Edit the
 * card copy freely; swap in a real figure if you want a hard number.
 */
export const HERO_VISUAL = {
  src: "/hero/skyline.webp",
  alt: "Modern Toronto waterfront condo towers at golden hour",
  card: {
    eyebrow: "New-home opportunities",
    title: "Bonus commission",
    body: "Exclusive incentives, surfaced before you pitch.",
  },
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
 * Brokerage logo marquee ("trust carousel") on the landing page.
 * IMPORTANT: only list brokerages you have permission to display — showing a
 * logo implies a relationship. Logo files live in /public/logos; entries
 * without a `src` fall back to a neutral wordmark.
 */
export const LOGO_STRIP = {
  label: "Trusted by realtors at Ontario's leading brokerages",
} as const;

export const BROKERAGES = [
  { name: "HomeLife", src: "/logos/homelife.png" },
  { name: "The Real Brokerage", src: "/logos/real.webp" },
  { name: "Right at Home Realty", src: "/logos/right-at-home.webp" },
  { name: "RE/MAX", src: "/logos/remax.png" },
  { name: "Royal LePage", src: "/logos/royal-lepage.png" },
  { name: "Century 21", src: "/logos/century-21.png" },
  { name: "eXp Realty", src: "/logos/exp-realty.png" },
] as const;

/**
 * Marketing visuals paired one-to-one with the three editorial sections.
 * Assets live in /public/showcase.
 */
export const SECTION_IMAGES = {
  inventory: {
    src: "/showcase/flash-sale.webp",
    alt: "A new-home listing showing asking price and client savings in LIQWD",
  },
  verified: {
    src: "/showcase/commission.webp",
    alt: "A verified realtor reviewing her commission on a new-home sale in LIQWD",
  },
  why: {
    src: "/showcase/exclusive-discount.webp",
    alt: "An exclusive new-home discount surfaced in LIQWD",
  },
} as const;

/**
 * Developer / builder marketing — the `/developers` landing page. Mirrors the
 * realtor landing structure (hero → proof → editorial sections → CTA) but
 * speaks to builders bringing pre-construction inventory to market.
 */
export const DEV_HERO = {
  headline: "Sell your project faster",
  subheadline: "to Ontario's verified agents",
  supporting: "For builders & developers",
  tagline: "Promote the offer, not the project.",
  body: "LIQWD puts your pre-construction inventory in front of thousands of verified Ontario realtors and motivated buyers — and lets you move it without touching your public price. Promote incentives discreetly, surface against live buyer demand, and reach the agents who can sell your units.",
  primaryCta: "List your project",
  secondaryCta: "Log in",
} as const;

export const DEV_PROOF_POINTS = [
  "Reach verified Ontario agents",
  "Confidential by default",
  "Built for pre-construction",
  "Demand-driven, not a directory",
] as const;

export const DEV_BENEFITS = [
  "Post deal requests — bulk buys, listing mandates, inventory units, or a full development — straight to Ultra agents.",
  "See live buyer demand: verified mandates from agents with ready, motivated buyers.",
  "Promote your project where agents and buyers are already searching.",
  "Connect directly with the agents who can move your units.",
  "Run it all from one workspace built for builders, not a generic CRM.",
] as const;

/** The killer wedge: promote the incentive, not a public price cut. */
export const DEV_DISCRETION = {
  heading: "Move units without touching your price",
  body: "Public price cuts wreck your comps, blow up appraisals, and burn the buyers who already paid. LIQWD lets you promote incentives quietly — to verified agents only, never the open market. Your headline price stays intact; the offer does the work.",
  points: [
    { title: "No public discounts", body: "Your headline price never moves — appraisals and comps stay protected." },
    { title: "Broker-only network", body: "Incentives stay inside a closed circle of verified agents." },
    { title: "Prior buyers protected", body: "Earlier purchasers never see a markdown on what they bought." },
    { title: "Reveal on your terms", body: "Keep sensitive terms hidden until you choose to share them." },
  ],
} as const;

export const DEV_DEMAND = {
  heading: "Sell into demand, not into the void",
  body: "Most portals are a directory you list into and hope. LIQWD is demand-driven: verified agents post buyer mandates describing exactly what their clients want — by city, price, and unit type — so you can match your inventory to real, ready buyers instead of broadcasting blindly.",
  bullets: [
    "Browse active buyer mandates that fit your project.",
    "Post deal requests and review agent proposals in one place.",
    "Keep sensitive terms private until you're ready to share them.",
  ],
} as const;

/** The à-la-carte "promote your project" products (also shown as dashboard shells). */
export const DEV_PROMOTE = {
  heading: "Promote your project",
  body: "When you're ready to push, put your offer in front of the network — built-in promotion that reaches verified agents (and, when you choose, end-buyers) without leaving a public price footprint.",
  bullets: [
    "Featured placement across browse and the homepage.",
    "eBlast to the verified realtor database.",
    "eBlast to the end-buyer audience.",
    "Performance analytics on every campaign.",
  ],
} as const;

export const DEV_SIGNUP_SECTION = {
  heading: "Bring your project to the network.",
  body: "Create your developer workspace and start reaching Ontario's verified agents and buyers.",
} as const;

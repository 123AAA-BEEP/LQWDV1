/**
 * The public comparison table (/compare). Competitor numbers come ONLY from
 * public pages or independent reviews — never from private proposals — and
 * carry a source and the date they were checked (rulebook CLAIM-5:
 * competitor references factual and neutral, criteria disclosed). Review
 * quarterly; bump CHECKED_ON when you do. Names are their owners' trademarks.
 *
 * LIQWD's own prices live in PRICING so they can be edited in one place —
 * they MUST match /dashboard/upgrade before this page is linked from ads.
 */

export const CHECKED_ON = "2026-09-02";

export const PRICING = {
  free: "$0",
  pro: "$99",
  premium: "$499",
  currency: "CAD",
} as const;

export type CompKind = "done" | "diy";

export interface Competitor {
  name: string;
  kind: CompKind;
  canada?: boolean;
  what: string;
  monthly: string;
  setup: string;
  contract: string;
  currency: "USD" | "CAD";
  source: { label: string; url: string };
}

export const COMPETITORS: Competitor[] = [
  // ---- Done-for-you platforms (humans behind the curtain) -----------------
  {
    name: "Luxury Presence",
    kind: "done",
    what: "Designed website plus marketing services",
    monthly: "from about $300 to $1,500",
    setup: "$3,500–5,000 reported",
    contract: "12-month agreement",
    currency: "USD",
    source: { label: "plans page + reviews", url: "https://www.luxurypresence.com/plans/" },
  },
  {
    name: "Real Geeks",
    kind: "done",
    what: "IDX website, CRM, lead-gen platform",
    monthly: "$299 to $1,599",
    setup: "$500",
    contract: "6–12 months",
    currency: "USD",
    source: { label: "pricing breakdown", url: "https://agentflowtools.com/real-geeks-pricing" },
  },
  {
    name: "Ylopo",
    kind: "done",
    what: "AI ad engine, bring your own CRM",
    monthly: "about $295 to $600 plus ad spend",
    setup: "quoted on demo",
    contract: "varies",
    currency: "USD",
    source: { label: "pricing page", url: "https://www.ylopo.com/pricing" },
  },
  {
    name: "Sierra Interactive",
    kind: "done",
    what: "Team platform; PPC at 10% of spend, $500 minimum",
    monthly: "$300 to $725",
    setup: "none listed",
    contract: "annual discount",
    currency: "USD",
    source: { label: "pricing page", url: "https://www.sierrainteractive.com/pricing/" },
  },
  {
    name: "AgentLocator",
    kind: "done",
    canada: true,
    what: "IDX site, CRM, dialer, managed ads",
    monthly: "$249, recommends $400+ all-in",
    setup: "none listed",
    contract: "none listed",
    currency: "CAD",
    source: { label: "Capterra listing", url: "https://www.capterra.ca/software/195054/agentlocator" },
  },
  {
    name: "BoldTrail (kvCORE)",
    kind: "done",
    what: "Brokerage-grade platform",
    monthly: "$499 to $750 solo",
    setup: "quoted",
    contract: "quoted",
    currency: "USD",
    source: { label: "pricing breakdown", url: "https://agentflowtools.com/kvcore-pricing" },
  },
  {
    name: "CINC",
    kind: "done",
    what: "Lead-gen platform",
    monthly: "$899 to $1,299 solo",
    setup: "quoted",
    contract: "quoted",
    currency: "USD",
    source: { label: "pricing breakdown", url: "https://www.luxurypresence.com/blogs/cinc-pricing/" },
  },
  {
    name: "AgentFire",
    kind: "done",
    what: "Designed website, no lead gen",
    monthly: "$165 to $215",
    setup: "$800–6,500",
    contract: "none listed",
    currency: "USD",
    source: { label: "pricing breakdown", url: "https://www.luxurypresence.com/blogs/agentfire-pricing/" },
  },
  {
    name: "Agent Image",
    kind: "done",
    what: "Custom-designed website",
    monthly: "$90 maintenance",
    setup: "$2,000 to $7,500+",
    contract: "1 year",
    currency: "USD",
    source: { label: "pricing breakdown", url: "https://www.luxurypresence.com/blogs/agent-image-pricing/" },
  },
  // ---- Do-it-yourself builders ---------------------------------------------
  {
    name: "Placester",
    kind: "diy",
    what: "Template site, light CRM; IDX is a $25 add-on",
    monthly: "$59 to $129",
    setup: "none",
    contract: "cancel anytime",
    currency: "USD",
    source: { label: "pricing page", url: "https://placester.com/pricing" },
  },
  {
    name: "myRealPage",
    kind: "diy",
    canada: true,
    what: "IDX site, CRM, email funnels",
    monthly: "$99",
    setup: "none",
    contract: "cancel anytime",
    currency: "USD",
    source: { label: "pricing page", url: "https://myrealpage.com/real-estate-website-pricing/" },
  },
  {
    name: "RealtyNinja",
    kind: "diy",
    canada: true,
    what: "Template site for Canadian boards",
    monthly: "$29 to $79",
    setup: "custom design $899–1,500",
    contract: "cancel anytime",
    currency: "CAD",
    source: { label: "pricing page", url: "https://www.realtyninja.com/real-estate-website-pricing" },
  },
  {
    name: "Web4Realty",
    kind: "diy",
    canada: true,
    what: "IDX site and CRM",
    monthly: "from $39",
    setup: "none; MLS fees extra",
    contract: "cancel anytime",
    currency: "USD",
    source: { label: "pricing page", url: "https://web4realty.com/pricing/" },
  },
  {
    name: "InCom",
    kind: "diy",
    canada: true,
    what: "IDX site and CRM",
    monthly: "from $39.95",
    setup: "board setup and data fees extra",
    contract: "none listed",
    currency: "CAD",
    source: { label: "price list", url: "https://www.incomrealestate.com/mls-coverage" },
  },
];

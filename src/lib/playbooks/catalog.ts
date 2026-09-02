/**
 * The agent-tier catalog — roadmap steps + module cards, exactly as an agent
 * would see them. This file IS the iteration surface: the founder edits copy
 * and ordering here (or asks for changes), and the admin Playbooks tab
 * re-renders the agent's-eye view.
 *
 * Card copy rules (positioning blueprint, Part 2): headline = pure benefit in
 * realtor language; body = one plain sentence, at most ONE industry-term
 * mention; anchor = one concrete number (time-to-value or effort); three
 * lines max. Internal codenames (W1, G2…) exist only in the `tool` field and
 * never render on agent surfaces.
 */

export type ModuleTier = "free" | "paid" | "premium";
export type ModuleStatus = "prototype" | "building" | "needs_api" | "live";

export interface PlaybookModule {
  tool: string; // internal id — NEVER shown to agents
  suite: string;
  headline: string;
  body: string;
  anchor: string;
  tier: ModuleTier;
  status: ModuleStatus;
  bestAfter?: string; // roadmap step id
  /**
   * Where an agent can do today's version of this module right now (the
   * realtor-facing Marketing plan renders an "Open" button). Absent = the
   * card is visible but shows "Coming soon" — never a bare padlock.
   */
  todayHref?: string;
}

export interface RoadmapStep {
  id: string;
  n: number;
  title: string;
  tier: "free" | "paid" | "mixed";
  body: string;
  hardGate?: string; // plain-language reason when the step is a real lock
}

export const ROADMAP_STEPS: RoadmapStep[] = [
  {
    id: "brand",
    n: 1,
    title: "Set up your brand",
    tier: "free",
    body: "Photo, logo, bio, brokerage details — five minutes, used by everything that follows. The progress bar shows exactly what's missing.",
  },
  {
    id: "website",
    n: 2,
    title: "Get your website",
    tier: "free",
    body: "Your own page at liqwd.ca/@yourname, in your look, ready to share. Your first visible win — minutes from signup.",
  },
  {
    id: "google",
    n: 3,
    title: "Show up on Google",
    tier: "mixed",
    body: "Free: connect your Google Business Profile and get a one-time fix-up report. Paid: we apply the fixes and post for you every week.",
  },
  {
    id: "content",
    n: 4,
    title: "Market a listing, feed your socials",
    tier: "free",
    body: "One listing in, a full kit out — plus a social calendar that keeps your feed alive without you thinking about it.",
  },
  {
    id: "domain",
    n: 5,
    title: "Go pro: your own domain",
    tier: "paid",
    body: "Your site on your own web address. We buy it, connect it, and point it — automatically.",
  },
  {
    id: "leads",
    n: 6,
    title: "Turn on leads",
    tier: "paid",
    body: "A landing page built for one job, then ads that send people to it. You pick the offer, the neighbourhoods, and the monthly budget in dollars.",
    hardGate:
      "Ads with nowhere good to send people burn money — so campaigns can't launch until your landing page is approved and lead tracking works.",
  },
  {
    id: "story",
    n: 7,
    title: "Watch it work",
    tier: "mixed",
    body: "Paid: what you spent, what you got, what we fixed, what's next. Free: what your page and posts did this month.",
  },
];

export const MODULES: PlaybookModule[] = [
  // Your brand & website
  {
    tool: "R8",
    suite: "Your brand & website",
    headline: "Complete your brand",
    body: "Upload once — your photo, logo, and bio flow into every page, post, and email we make for you.",
    anchor: "5 minutes, once",
    tier: "free",
    status: "building",
    bestAfter: undefined,
    todayHref: "/dashboard/profile",
  },
  {
    tool: "W-personal",
    suite: "Your brand & website",
    headline: "Get your own website",
    body: "A professional page at liqwd.ca/@yourname with your brand, your neighbourhoods, and a working contact form.",
    anchor: "ready in about 10 minutes",
    tier: "free",
    status: "building",
    bestAfter: "brand",
    todayHref: "/dashboard/my-page",
  },
  {
    tool: "W-domain",
    suite: "Your brand & website",
    headline: "Put it on your own domain",
    body: "Same site, your own web address — we handle the buying and connecting.",
    anchor: "one click, about $20/yr",
    tier: "paid",
    status: "building",
    bestAfter: "website",
  },
  // Google presence
  {
    tool: "G2-report",
    suite: "Google presence",
    headline: "See what Google thinks of you",
    body: "A one-time check-up of your Google Business Profile: what's wrong, and what it's costing you.",
    anchor: "report in 24 hours",
    tier: "free",
    status: "needs_api",
    bestAfter: "brand",
  },
  {
    tool: "G2+G5",
    suite: "Google presence",
    headline: "Show up on Google Maps",
    body: "We tune your Google Business Profile and post to it weekly, so you appear when people search your area.",
    anchor: "runs weekly on its own",
    tier: "paid",
    status: "needs_api",
    bestAfter: "google",
  },
  {
    tool: "G4",
    suite: "Google presence",
    headline: "Never miss a review",
    body: "Every review gets a reply in your voice — happy ones fast, tough ones only after you approve.",
    anchor: "replies drafted same day",
    tier: "paid",
    status: "needs_api",
    bestAfter: "google",
  },
  {
    tool: "G1",
    suite: "Google presence",
    headline: "See where you rank on the map",
    body: "A weekly heat map of where you show up in Maps results across your neighbourhoods.",
    anchor: "updated every week",
    tier: "paid",
    status: "building",
    bestAfter: "google",
  },
  // Listings & content
  {
    tool: "R2",
    suite: "Listings & content",
    headline: "Market a listing",
    body: "One listing in — graphics, flyer, feature sheet, email, and a landing page out, all in your brand.",
    anchor: "about 90 seconds of your time",
    tier: "free",
    status: "building",
    bestAfter: "website",
  },
  {
    tool: "R3",
    suite: "Listings & content",
    headline: "Feed your socials",
    body: "A rotating calendar of posts — listings, market notes, neighbourhood spotlights — sized for every platform.",
    anchor: "4 weeks scheduled at a time",
    tier: "paid",
    status: "building",
    bestAfter: "content",
  },
  {
    tool: "R6",
    suite: "Listings & content",
    headline: "Your market numbers, monthly",
    body: "A neighbourhood market snapshot in your brand — every number sourced, never an appraisal.",
    anchor: "auto-drafted monthly",
    tier: "paid",
    status: "building",
    bestAfter: "content",
  },
  {
    tool: "R1",
    suite: "Listings & content",
    headline: "Win the listing appointment",
    body: "A branded presentation with local market data and your track record, ready before you knock.",
    anchor: "deck in 10 minutes",
    tier: "paid",
    status: "building",
    bestAfter: "content",
  },
  // Leads
  {
    tool: "W1",
    suite: "Leads",
    headline: "A page built to capture leads",
    body: "A landing page with one job — turning a click into a name and number — plus a variant to test against it.",
    anchor: "two versions, one approval",
    tier: "paid",
    status: "building",
    bestAfter: "domain",
  },
  {
    tool: "L1",
    suite: "Leads",
    headline: "Turn on lead campaigns",
    body: "Google ads for your offer and neighbourhoods, launched paused until you approve — with hard spending caps.",
    anchor: "you set the monthly budget",
    tier: "paid",
    status: "needs_api",
    bestAfter: "leads",
  },
  {
    tool: "M2-digest",
    suite: "Leads",
    headline: "Your weekly results digest",
    body: "Leads, cost per lead, what changed, and what we're doing about it — in plain language.",
    anchor: "every Monday",
    tier: "paid",
    status: "needs_api",
    bestAfter: "leads",
  },
  // The edge
  {
    tool: "V-agent",
    suite: "The edge",
    headline: "What does AI say about you?",
    body: "When buyers ask ChatGPT for an agent in your neighbourhood, find out who comes up — and what moves you up.",
    anchor: "monthly snapshot",
    tier: "premium",
    status: "building",
    bestAfter: "story",
  },
];

export const SUITE_ORDER = [
  "Your brand & website",
  "Google presence",
  "Listings & content",
  "Leads",
  "The edge",
];

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  prototype: "Prototype",
  building: "Building",
  needs_api: "Waiting on API approval",
  live: "Live",
};

/**
 * Pre-construction playbook content for resale-oriented agents. Kept as
 * structured data so it can be rendered on the dashboard playbook page, surfaced
 * as an objection-handler on the dashboard + landing, and reused on the project
 * "quick facts" view.
 */

/** The realtor's own hesitations about pre-construction — and LIQWD's answer. */
export const AGENT_CONCERNS = [
  {
    concern: "I've only ever sold resale.",
    answer:
      "You don't need to be a pre-construction expert. The playbook walks you through qualifying, positioning, and following up — step by step.",
  },
  {
    concern: "I don't know the builder process.",
    answer:
      "Every project page lays out the timeline, deposit structure, incentives, and next steps in plain language.",
  },
  {
    concern: "I'm worried I'll look unprepared.",
    answer:
      "A one-page quick-facts sheet per project lets you speak with confidence in minutes, not hours.",
  },
] as const;

/** The fields a project's quick-facts sheet should carry (Part 1 of the manual). */
export const QUICK_FACTS_FIELDS = [
  {
    section: "Project identity",
    include: "Project name, builder / developer, address, municipality / neighbourhood",
  },
  {
    section: "Product type",
    include: "Condo, townhome, detached, semi-detached, mixed-use, phase name",
  },
  {
    section: "Pricing snapshot",
    include: "Starting prices, deposit structure, incentive summary, maintenance estimate",
  },
  {
    section: "Timeline",
    include: "Launch stage, sales status, occupancy estimate, closing estimate",
  },
  {
    section: "Unit / product overview",
    include: "Models or suite ranges, sizes, bedroom types, parking / locker notes",
  },
  {
    section: "Amenities",
    include: "Building / community amenities, parks, schools, retail, transit, highways",
  },
  {
    section: "Buyer profile",
    include: "Best-fit segments: end users, downsizers, first-time buyers, investors",
  },
  {
    section: "Selling features",
    include: "5–8 plain-language reasons this project stands out",
  },
  {
    section: "Agent tools",
    include: "Broker portal, floorplans, price list, worksheets, site plan, incentive sheet, FAQ",
  },
  {
    section: "Contact path",
    include: "Sales contact, submission steps, registration link, presentation booking",
  },
] as const;

/** Selling-feature prompts to help an agent find a project's angle. */
export const SELLING_FEATURE_PROMPTS = [
  "What problem does this project solve for the buyer?",
  "Why buy here instead of resale nearby?",
  "Why buy now instead of waiting?",
  "What is unique about the builder, location, floorplans, incentives, or transit?",
  "Which buyer type is most likely to say yes?",
] as const;

/** The repeatable inquiry → reservation → follow-up process (Part 2). */
export const SALES_STEPS = [
  {
    title: "Learn the project fast",
    body: "Skim the quick-facts sheet, price list and deposit structure, floorplans, incentives and commission, the timeline, and the top selling features. You don't have to memorize it — just know enough to explain the opportunity simply and know where to find the rest.",
  },
  {
    title: "Qualify the lead",
    body: "Make contact early and find fit before pitching. Ask whether they're buying to live in or invest, the location and price range, the home type, and their decision timeline.",
  },
  {
    title: "Position pre-construction properly",
    body: "Help the buyer see how it differs from resale: they buy before completion, sign a builder agreement, follow a staged deposit schedule, and close later once the home is built.",
  },
  {
    title: "Match the buyer to the project",
    body: "Don't present every detail. Lead with the 3–5 reasons this specific project fits this specific buyer.",
  },
  {
    title: "Handle objections simply",
    body: "Keep answers short and confident. Most concerns come down to timing, pricing, and the unfamiliar process — all of which have clear, honest answers.",
  },
  {
    title: "Ask for the next commitment",
    body: "End every conversation with one clear action — book a presentation, send matched floorplans, review pricing and deposits, register for the release, or schedule a follow-up.",
  },
  {
    title: "Follow up with structure",
    body: "A simple, consistent rhythm beats random check-ins. Thank them the same day, send options within 24 hours, answer objections within a few days, invite them to the next step within a week, then keep them updated on releases and incentives.",
  },
] as const;

/** Five quick qualification questions. */
export const QUALIFY_QUESTIONS = [
  "Are you buying for yourself or as an investment?",
  "Which location are you focused on?",
  "What price range are you comfortable with?",
  "What type of home or unit are you looking for?",
  "What is your timeline to make a decision?",
] as const;

/** How to position each buyer type (Step 4). */
export const BUYER_MATCH = [
  {
    type: "Investor",
    body: "Rental-friendly location, transit access, a smaller entry price point, and strong end-user appeal.",
  },
  {
    type: "End user",
    body: "Newer finishes, a family-oriented layout, school access, and lower maintenance at move-in.",
  },
  {
    type: "Downsizer",
    body: "An elevator building, convenient floorplans, amenities, and a low-maintenance lifestyle.",
  },
] as const;

/** Buyer objections and confident, honest responses (Step 5). */
export const BUYER_OBJECTIONS = [
  {
    objection: "I usually buy resale.",
    response:
      "Resale is immediate, but this gives your client time, a brand-new product, and staged deposits instead of a full closing up front.",
  },
  {
    objection: "I'm not sure the pricing isn't too high.",
    response:
      "Compare it to nearby resale and other new-build options, then focus on product quality, timeline, and long-term value.",
  },
  {
    objection: "The wait is too long.",
    response:
      "True for some buyers — so this only fits people whose timing allows planning ahead.",
  },
  {
    objection: "I don't understand the process.",
    response:
      "It breaks down into registration, selection, paperwork, deposits, construction updates, occupancy, and final closing.",
  },
  {
    objection: "What if I'm not ready?",
    response:
      "Then the next step isn't to force a purchase — it's to keep your client informed until timing and confidence line up.",
  },
] as const;

/** One clear next commitment to close each conversation on (Step 6). */
export const NEXT_COMMITMENTS = [
  "Book a project presentation",
  "Send matched floorplans",
  "Review pricing and deposit options",
  "Register the client for the release",
  "Schedule a follow-up call",
] as const;

/** A simple, repeatable follow-up cadence (Step 7). */
export const FOLLOWUP_SEQUENCE = [
  { when: "Same day", action: "Thank-you message and a short project summary." },
  { when: "Within 24 hours", action: "Send 2–3 relevant floorplans or product options." },
  { when: "2–3 days", action: "Answer objections and confirm level of interest." },
  { when: "Within 1 week", action: "Invite to a presentation, worksheet review, or registration." },
  { when: "Ongoing", action: "Update on releases, incentives, price changes, and inventory." },
] as const;

/** The plain-language explanation of what pre-construction is. */
export const PRECON_EXPLAINER =
  "Pre-construction lets your client secure a home at today's price before it's built — usually through staged deposits and a later closing timeline. It's best for buyers who are comfortable planning ahead and want a new-build product, builder features, and time before final closing.";

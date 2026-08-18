# Microsite Context Questionnaire — the predefined staple

**Status: adopted 2026-08-12 (founder). Companion to the microsite concept
in `docs/scoping-ingestion-microsites-florida.md`. When the microsite
template build starts, this becomes the per-project intake (stored on the
microsite config; consumed by the content generator as prompt context).**

Design rules:
- **Every question is optional.** Blank answers fall back to data-derived
  defaults (see bottom). Context upgrades a page from competent to
  targeted; its absence never blocks a launch.
- **Answers map mechanically** to template behaviour: audience → section
  order + voice; hook → hero; avoid-list → negative prompt constraints;
  nuggets → unique-content differentiators (the E-E-A-T layer no
  competitor microsite can copy).
- **Voice-note friendly**: the founder answers in one rambling memo per
  project; ops or the intake agent parses into the config.

## Tier 1 — Positioning spine (~60 seconds, highest leverage)

1. **Who's the buyer?** (≤2): first-time buyers · young professionals ·
   young families · downsizers · investors · commuters · luxury.
   → Reorders the entire page. E.g. young professionals ⇒ commute,
   lifestyle, price-vs-rent lead; schools demoted or omitted.
2. **The one-line hook** — why this project matters.
   → Hero H1/subhead angle; every section supports it.
3. **Price positioning for its area**: value / market / premium.
   → Sets the money voice ("sharpest entry price in the corridor" vs
   "priced for what it is").
4. **Lead with (top 2)**: price/value · location/commute · builder
   reputation · product scarcity · investment math · lifestyle/amenities.
5. **Soft-pedal or avoid**: angles/details not to emphasize or mention
   (unconfirmed facts, sensitive topics, competitors not to name).

## Tier 2 — Audience deep-dives (answer only what applies)

6. **Families**: schools/parks/rec genuinely worth naming.
7. **Young professionals**: commute anchors (station, downtown minutes),
   lifestyle nodes that actually matter.
8. **Investors**: nearby tenant pool (hospital/university/employer), rent
   context we can cite.
9. **Downsizers**: single-level plans, low-maintenance angle,
   walk-to-services.

## Tier 3 — Facts we can't scrape (gold when present)

10. **Deposit structure / incentives** we are ALLOWED to publish.
11. **Timeline**: VIP date, public launch, sales-centre opening.
12. **Exclusives**: anything we hold early (plans, pricing, allocation).
13. **Local knowledge nuggets** — "backs onto the ravine", "rec centre
    across the street opening 2027". Highest SEO value on the list:
    unique, checkable, unscrapeable.
14. **Lead fulfilment**: chosen steward agent, or admin pool until claimed.

## Tier 4 — Guardrails (per project)

15. Words/claims to avoid (builder sensitivities, legal).
16. Competitors to compare against — or explicitly not.

## Defaults when unanswered

- **Audience** inferred from product type + price band + bedroom mix
  (3-bed towns at area-median ⇒ young families; 1-bed transit condos ⇒
  professionals/investors).
- **Lead angle** defaults to price + location; standard section order.
- **Tone**: the LIQWD house voice (outcome-first, no hype, facts cited).
- Tier 1 Q5 and Tier 4 always compile into NEGATIVE constraints for the
  generator — what a page omits is part of positioning.

## Implementation note (for the template build)

Config shape per microsite: `{ domain, project_id, skin, context: {q1..q16},
capture_key }`. The generator receives `context` alongside the grounded
project facts; the editor-in-chief gate checks the page respects the
avoid-list. Same staple applies to flagship LIQWD project pages if we ever
want targeted regeneration there.

# BUILD PROMPT — Buyer-Tools Calculator Pack (Phase A) + Assignment Value Calculator (Phase B)

**How to use:** paste the prompt below into a fresh Claude Code session on this repo (branch off
latest `main`). Phase A can ship alone; Phase B may be run in the same or a follow-up session.
Authored 2026-07-28 from `docs/tools-calculators-spec.md` + `docs/assignment-value-estimate-spec.md`
with founder decisions locked (see Decision Log at bottom). This file is the prompt's source of
truth — if the prompt and the spec docs conflict, this file wins.

---

## THE PROMPT

You are building public SEO calculator tools for LIQWD, a Next.js 16 (App Router) + Supabase +
Tailwind v4 platform for Ontario pre-construction. Work on a new branch off latest `main`.
Read these before writing code:

- `docs/tools-calculators-spec.md` and `docs/assignment-value-estimate-spec.md` (product intent)
- `src/app/(public)/tools/hst-rebate-calculator/page.tsx` + `src/components/tools/hst-calculator.tsx`
  and the deposit-calculator equivalents — **your pages must follow this exact house pattern**:
  server page (metadata, canonical, breadcrumb, FAQ constant → FAQPage JSON-LD, WebApplication
  JSON-LD, cross-link footer, disclaimer footer) + a small client calculator component in
  `src/components/tools/`.
- `src/app/(public)/tools/page.tsx` (hub — add cards for each new tool)
- The sitemap/robots implementation (ensure new routes are included)
- The leads flow: `project_leads` table + the public lead-form action
  (`src/app/(public)/projects/[slug]/...` lead action) + admin leads console — Phase B reuses it.

### Non-negotiable constraints (all phases)

1. **Disclaimer (verbatim, on every tool page near the results AND in the footer):**
   > "This tool is for educational and entertainment purposes only. Results are estimates based
   > on general assumptions and may not reflect your situation. Nothing here is tax, legal,
   > financial, investment, or valuation advice, and no result is an appraisal or an opinion of
   > value. Confirm the numbers with your accountant, lawyer, or a qualified professional before
   > making decisions."
   Keep the existing short footer-disclaimer style too where the house pattern has one.
2. **No MLS/board data anywhere** — inputs are user-entered; reference data comes only from
   (a) constants in this repo with source citations in comments, and (b) LIQWD's own database.
   No scraping, no third-party APIs.
3. Results are **free and ungated**. No paywalls. (Signup gating applies ONLY to the Phase B
   precise-midpoint feature described below.)
4. Create `src/lib/tax-rules/ontario.ts` — single source of truth for every rate, threshold,
   and date used by all three tools, each constant commented with its official source, plus
   `LAST_REVIEWED = "2026-07"` rendered on each page as "Rates last reviewed July 2026".
5. Every figure encoded must match the rules below (verified 2026-07-28); where told to
   RE-VERIFY, check the cited primary source and correct the constant if it moved.
6. TypeScript strict, `npm run lint` + `npm run build` clean, mobile-first, match existing
   design tokens. Do not touch unrelated code.

### Phase A — three workstreams

**A0. Bill C-4 fold-in on the existing HST-rebate calculator** (`/tools/hst-rebate-calculator`)
- Add a "First-time buyer?" toggle. When on and eligible, add the **FTHB GST rebate** line:
  100% of the 5% GST rebated for qualifying new homes priced ≤ $1,000,000 (max $50,000),
  linear phase-out between $1,000,000 and $1,500,000, zero at $1.5M.
- Eligibility inputs/notes to encode: first-time-buyer status; APS entered into **after
  2025-03-19** (RE-VERIFY against the enacted Bill C-4 text — earlier draft said 2025-05-26/27)
  and before 2031; anti-avoidance note (no re-papering an older APS). Note that builders
  typically credit it at closing.
- Interplay: FTHB rebate replaces the old federal 36% piece when claimed (no double-claim on
  the GST portion); the Ontario 75% provincial rebate (max $24,000) is unchanged and stacks.
- Add 2–3 FAQ entries about the C-4 rebate; refresh metadata copy to mention it.

**A1. Interim Occupancy Fee Calculator** — new page `/tools/interim-occupancy-calculator`
- Basis: Condominium Act, 1998 s. 80(4). Monthly fee = interest + est. municipal tax + est.
  common expenses:
  - Interest = (purchase price − deposits paid) × (annual rate ÷ 12). Prefill the rate with a
    `tax-rules` constant documented as the Bank of Canada 1-year conventional-mortgage-linked
    prescribed rate (editable input; RE-VERIFY current value when building).
  - Tax = purchase price × municipal residential rate ÷ 12. Municipal dropdown: Toronto,
    Mississauga, Brampton, Vaughan, Markham, Richmond Hill, Oakville, Hamilton, Ottawa +
    "Other" (manual rate entry). Rates live in `tax-rules` with source comments.
  - Common expenses = $/sqft × sqft (default hint $0.55–$0.65/sqft) OR direct monthly $.
- Inputs: price; deposits (% chips 5/10/15/20 or $, default 20%); municipality; sqft + $/sqft
  or direct fee; rate (prefilled, editable); occupancy length slider 1–24 months (default 6).
- Outputs: monthly fee with three-line breakdown; total over the period; a "what changes it"
  panel (larger deposit shrinks the interest line; the schedule is the builder's). State
  clearly: fees are **not** credited to the purchase price; concept applies to condos (if the
  user indicates freehold, show an explainer instead of results).
- H1 "Interim occupancy fee calculator (Ontario)", subhead using the phrase "phantom rent".
- 5–6 FAQs per the spec (what it is / why it exists / is it rent / is it credited / typical
  length 2–12 months / can I reduce it / leasing during occupancy needs builder consent).

**A2. Assignment Sale Tax Calculator** — new page `/tools/assignment-tax-calculator`
- HST side (ETA s.192.1; CRA Notice 323 + GI-120 — cite in copy):
  - Assignments agreed on/after 2022-05-07 are taxable for all assignors.
  - Taxable consideration = assignment price **minus deposit reimbursement IF the assignment
    agreement papers the deposit amount in writing** (toggle input; when "no", tax the full
    price and show a warning: "get this clause in writing").
  - HST = 13% × taxable consideration; toggle for HST-extra vs HST-included presentation.
- Income-tax side: profit = assignment price − deposits − selling costs (commission, legal,
  builder consent fee inputs). If the disposition is within 12 months of signing the APS
  (date input) → federal property-flipping rule: **business income** (no 50% inclusion),
  life-event exceptions linked in an FAQ. Always show BOTH treatments side by side —
  "business income (most flips)" vs "capital gain (fact-dependent)" — using a 3-option Ontario
  combined marginal-rate selector (encode current bracket presets in `tax-rules`; RE-VERIFY).
  Never present a single unqualified "your tax" number.
- Outputs: HST owing; profit; tax estimate under each treatment; estimated net-in-pocket;
  effective % of premium kept. Result panel carries the disclaimer block directly beneath it.
- FAQs per spec (do I charge HST / is the deposit taxed / capital gain or business income /
  losses / non-resident s.116 pointer / assignee-side LTT-NRST out of scope).
- Cross-link prominently to `/agents/assignment-desk` and the Phase B tool when it exists.

**A finish:** add both new tools to the `/tools` hub with card copy, ensure sitemap inclusion,
internal links between all four tools, and from the deposit calculator to the occupancy
calculator ("what happens after deposits: interim occupancy").

### Phase B — Assignment Value Calculator (seller-side lead-gen tool)

New page `/tools/assignment-value-calculator` (H1: "What is your assignment worth?").
Implements AVE v1 per `docs/assignment-value-estimate-spec.md` §1 with calculator-style UX.
Target queries: "assignment value calculator", "what is my assignment worth", "condo
assignment value", "sell my assignment Toronto".

- Inputs: project typeahead over LIQWD `projects` (manual city/segment fallback), unit sqft,
  original purchase price, purchase year, optional floor band/exposure/parking, expected
  occupancy window.
- Engine (server-side, LIQWD data only — this is the "internal PSF" use):
  1. Current-launch PPSF band from active comparable projects (same city + segment) computed
     from our `projects` pricing fields; require ≥3 comparables, else widen to region and
     lower the confidence label.
  2. Incentive adjustment from our incentives data (prevalence in the segment).
  3. Assignment liquidity discount: constant band **8–12%** (single constant, commented as a
     documented ASSUMPTION, tunable; founder will refine quarterly).
  4. Capped adjustments for floor/exposure/parking (small, transparent).
- Output — public/no login: a RANGE + direction vs. original price + confidence label
  (High/Med/Low by comparable density) + top-3 drivers in plain language + the disclaimer
  block. **Behind free signup:** precise midpoint + driver breakdown. Do not build a PDF.
- **Lead generation (founder-confirmed):** on unlock/signup or "talk to an agent" submission,
  create a lead through the existing `project_leads` flow with the same admin notification
  behavior as project-page leads. Inspect the current schema first; if a tool lead can't
  reference a specific project cleanly, add a minimal migration (e.g. nullable page reference
  + a `source` value like `tool:assignment-value`) following existing migration conventions —
  smallest change that makes leads visible in the existing admin/realtor leads surfaces.
- CTA: "List it on the Assignment Desk — free", linking to the Desk intake prefilled via query
  params with whatever fields the intake already accepts (do NOT rebuild the intake).
- Add a short public methodology section on-page (what the estimate uses, what it does not —
  explicitly "no MLS data"), plus 4–5 FAQs around assignment-worth keywords.
- Log every estimate server-side (inputs + outputs + timestamp) in a small table so accuracy
  can be back-tested later; no PII beyond the signed-in user id when present.
- Hard content rules: never render "underwater"-style language about a named project; ranges
  only in public output; the word "appraisal" appears only inside the disclaimer.

### Acceptance checklist (self-verify before finishing)
- [ ] All rates/dates flow from `src/lib/tax-rules/ontario.ts`, each with a source comment;
      RE-VERIFY items checked against primary sources and constants corrected if moved.
- [ ] Disclaimer block verbatim on every tool page near results.
- [ ] FAQPage + WebApplication JSON-LD valid on each page; canonicals; breadcrumbs; hub cards;
      sitemap includes all tool routes.
- [ ] Occupancy calc matches s.80(4) three-component math; assignment calc respects the
      papered-deposit HST exclusion and the 12-month business-income rule.
- [ ] Phase B: no MLS/external data paths; leads appear in the existing admin leads console;
      estimate logging works; signup gate only on the precise midpoint.
- [ ] `npm run lint` and `npm run build` pass; no unrelated files touched.

---

## Decision Log (founder, 2026-07-28)
1. PDF-email capture: **deferred** — not built in this pass (nice-to-have).
2. Captured emails/leads: **reuse the project-leads flow + notifications** (Phase B).
3. Bill C-4: **fold into the existing HST-rebate page** (A0), no separate page.
4. Municipal tax table: GTA core 9 + Ottawa/Hamilton + manual "Other" (call made for founder).
5. Liquidity discount band: **8–12%, single tunable constant, labelled assumption** (call made).
6. Signup wall: **range public, precise midpoint behind free signup** (recommendation adopted).
7. Index cadence: quarterly (unchanged; Index itself is NOT part of this build prompt).
8. AVE → Desk prefill: **v1 = query-param prefill CTA only**; deeper integration later.

# Tools Frame-Out — Interim Occupancy + Assignment Tax Calculators (+ C-4 refresh)

**Status: FRAME-OUT ONLY. Do not implement until founder approves.**
Date: 2026-07-28. Companion: `docs/growth-ideas-assessment.md`. House pattern reference:
`src/app/(public)/tools/*` (server page + client calculator in `src/components/tools/`,
FAQ constant → FAQPage JSON-LD, WebApplication JSON-LD, breadcrumb, cross-links, disclaimer).

## Why these two
SERP research (2026-07-28): "interim occupancy calculator" — **no interactive tool ranks**;
only explainer posts (Houseeo, law firms) and Tarion's guide. "Assignment tax calculator" —
one tax-law-firm tool (Advotax) plus generic HST pages. Both are winnable, evergreen,
zero-data-dependency pages that feed free signups.

---

## Workstream 0 — Bill C-4 refresh of the existing HST-rebate calculator (CONFIRMED GAP)

The live page (`src/app/(public)/tools/hst-rebate-calculator/page.tsx`) covers only the
federal 36% rebate (max $6,300, $350k–$450k phase-out) + Ontario 75% (max $24k). It does not
mention the **FTHB GST rebate (Bill C-4, Royal Assent 2026-03-12)**: 100% of GST rebated on
new homes ≤ $1M (up to $50,000), linear phase-out $1M–$1.5M.

Scope of refresh:
- Add an "Are you a first-time buyer?" toggle → adds the FTHB GST rebate line when eligible.
- Eligibility gates to encode: FTHB definition; APS entered into **after 2025-03-19** per the
  enacted version (earlier tabled draft used May 26/27, 2025 — RE-VERIFY against the enacted
  text during build); before 2031; construction/occupancy conditions; anti-avoidance (no
  re-papering old APS). Builder-credited at closing is the common path.
- Interplay note: FTHB rebate covers the GST portion; the Ontario 75% provincial rebate is
  unchanged and stacks. No double-claim of the old federal 36% on the same GST.
- FAQ additions (2–3 questions) + metadata refresh ("2026", "$50,000") for freshness signals.

## Workstream 1 — Interim Occupancy Fee Calculator

- **URL:** `/tools/interim-occupancy-calculator`
- **Title/H1:** "Interim Occupancy Fee Calculator (Ontario)" — subhead uses "phantom rent"
  (the term buyers actually search).
- **Keywords:** interim occupancy calculator · occupancy fee calculator · phantom rent
  calculator · interim occupancy fees Ontario condo.

**Legal basis (content + formula):** Condominium Act, 1998, s. 80(4) — monthly occupancy fee =
(a) interest on the unpaid balance of the purchase price at the prescribed rate +
(b) estimated municipal taxes for the unit + (c) projected common expenses.
Prescribed rate ties to the Bank of Canada 1-year conventional mortgage rate (O. Reg. 48/01 —
confirm exact wording at build).

**Inputs**
| Field | Notes / default |
|---|---|
| Purchase price | required |
| Deposits paid by occupancy | % chips (5/10/15/20) or $; default 20% |
| Municipality | dropdown w/ residential tax-rate table (Toronto, Mississauga, Brampton, Vaughan, Markham, Richmond Hill, Oakville, Hamilton, Ottawa) + "other" manual rate |
| Unit sqft + common-expense $/sqft | default hint $0.55–$0.65/sqft; or direct $ entry |
| Interest rate | prefilled editable (current BoC 1-yr conventional rate; constant updated on the maintenance calendar) |
| Expected occupancy length | slider 1–24 months, default 6 |

**Outputs:** monthly fee with 3-line breakdown (interest / taxes / common expenses), total for
the occupancy period, and a "what changes it" panel (bigger deposit → smaller interest line;
occupancy length is the developer's schedule, not yours). Prominent facts: fees are **not**
credited to the purchase price; condo-only concept (freehold selection shows an explainer
instead of results).

**FAQ seed (→ FAQPage schema):** What is interim occupancy / why does it exist (registration
gap)? Is it rent? Is it credited to my price? How long does it last (2–12 months typical)? Can
I reduce it (larger deposit; early-payment of balance only if the APS permits)? Can I lease the
unit during occupancy (builder consent)?

## Workstream 2 — Assignment Sale Tax Calculator

- **URL:** `/tools/assignment-tax-calculator`
- **Title/H1:** "Assignment Sale Tax Calculator — HST + Income Tax (Ontario)"
- **Keywords:** assignment HST calculator · HST on assignment sale Ontario · assignment sale
  tax calculator · tax on assignment condo.

**Rules to encode (verified 2026-07-28):**
1. **HST:** assignment agreements entered into on/after **2022-05-07** are taxable for all
   assignors (ETA s.192.1; CRA Notice 323 / GI-120). **Deposit-reimbursement portion is
   EXCLUDED from taxable consideration when the assignment agreement states it in writing**
   — otherwise the full assignment price is taxable. (This supersedes the "including deposit"
   line in `growth-ideas-assessment.md` §7 — corrected there.)
   HST = 13% × taxable consideration. Toggle: HST-extra vs HST-included framing.
2. **Income tax:** federal property-flipping rule — disposition within 12 months of entering
   the APS (assignments included, dispositions after 2022) → **business income**, no 50%
   capital-gains inclusion, life-event exceptions listed. Beyond 12 months: business-vs-capital
   still fact-dependent (CRA commonly treats assignment flips as business income) — show both
   treatments side-by-side with guidance, never a single "your tax" number.

**Inputs:** original price · deposits paid to builder · assignment price · "deposit
reimbursement papered separately?" (yes/no — drives the HST exclusion, with a "get this clause
in writing" warning) · date APS signed (drives the 12-month rule) · selling costs (commission,
legal, builder consent fee — deductible) · marginal-rate selector (three ON combined brackets).

**Outputs:** HST owing (and who typically remits) · profit calculation · income-tax estimate
under business-income treatment vs capital-gains treatment (labelled "most flips are business
income") · estimated net-in-pocket · effective % of premium kept.

**FAQ seed:** Do I charge HST on my assignment? Is my deposit taxed? Is assignment profit a
capital gain? What if I sell at a loss? Non-resident assignor (s.116 note — see a lawyer).
Assignee-side costs (LTT/NRST) are out of scope → link future closing-cost calculator.

**Compliance:** education only, not tax/legal advice, "confirm with an accountant" footer
(match existing tools). Cite CRA sources in the copy (trust + E-E-A-T).

---

## Shared framework (all three)

- **Lead capture:** results always free and instant (never gated). One gated artifact:
  "Email me this breakdown (PDF)" — name + email + CASL consent → decision needed on storage
  (existing `project_leads` vs a small `tool_leads` table). Secondary CTA links (Assignment
  Desk for the tax calc; deposit/HST calcs for occupancy) — no lead promises.
- **Schema:** FAQPage + WebApplication JSON-LD (house pattern); breadcrumbs; canonical;
  ensure `/tools/*` are in the sitemap.
- **Single source of truth for rules:** a constants module (e.g. `src/lib/tax-rules/ontario.ts`)
  holding rates/thresholds/dates with a `lastReviewed` stamp surfaced on-page ("Rates reviewed
  July 2026") — freshness signal + one place to maintain.
- **Maintenance calendar:** quarterly review (BoC rate, municipal tax table, C-4 thresholds,
  Tarion figures). Owner: founder/admin.
- **Jurisdictions:** Ontario-only at launch. Structure the rules module per-province so a BC
  variant (GST 5%, PTT, no s.80 analog, CSBA assignment disclosure) is additive later — do not
  build BC now.
- **Success metrics:** GSC impressions/clicks for the target queries; tool → signup conversions;
  PDF-email captures; assignment-calc → Assignment Desk clickthroughs.

## Open decisions (founder)
1. PDF-email capture at launch, or ship without capture first and add once traffic shows?
2. Where captured emails land (`project_leads` vs new `tool_leads`) + CASL consent copy.
3. Municipal tax table scope (GTA-only vs +Ottawa/Hamilton at launch).
4. C-4 refresh: fold FTHB into the existing calculator (recommended) vs a separate
   `/tools/fthb-gst-rebate-calculator` page (extra keyword surface, more maintenance).
5. Marginal-rate handling in the tax calc: 3 preset brackets (recommended) vs free entry.

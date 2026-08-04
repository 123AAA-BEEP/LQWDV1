# Research Module (Zonda-style) — future project spec

**Status: PARKED (founder-flagged 2026-07-31). Not scheduled. Build the
free-data subset as the developer "Research" module when appetite exists —
`/dashboard/research` is already the coming-soon stub.**

Origin: feasibility assessment of the Zonda feature set (founder-supplied
CSVs) against our live database (at time of writing: 2,100 projects, 3,003
discovery signals, 606 tracked builders, 4,847 page events). Zonda's moat is
licensed data, not software — so the plan splits by data availability.

## Bucket A — buildable today with data we already hold

- **Lifecycle tracking**: discovery crons (UrbanToronto/Skyrise, news,
  building permits, builder directories) + audit machine + status flow
  already cover launch → selling → sold out. Missing only land/lot
  front-of-funnel.
- **Explorer + batch reporting**: browse filters exist; PDF/Excel export is
  pure software.
- **Segmentation** by type/price (lot size excluded — no parcel data).
- **Custom geography**: lat/long + postal codes held; needs PostGIS
  (Supabase extension) + free StatCan boundary files for draw-a-boundary.
- **Builder benchmarking (lite)**: rank 606 tracked builders by
  projects/units/launches. (True market share needs closings — Bucket C.)
- **AI competitive market reports**: the grounded-generation engine already
  does this shape.
- **Field/iPad version**: responsive already; PWA wrapper trivial.

## Bucket B — buildable with FREE public data not yet ingested

One-time ETLs, all openly licensed:

1. **StatCan census profiles** — population, income, households,
   employment-by-industry to census-tract level → demographic reports AND
   city-hub/pSEO enrichment.
2. **CMHC rental data** — vacancy, rents by bedroom, universe counts,
   under-construction PBR by zone → the Canadian BTR module; directly arms
   the Rental Lead Partners pitch.
3. **HCRA builder directory + Tarion enrolments** — licensed-builder status
   + new-home enrolments as free builder-activity proxies.
4. **Sentinel-2 imagery (optional)** — free 10m satellite for
   started/not-started on big sites; permits are the better construction
   signal for low-rise.

## Bucket C — blocked on paid/licensed data

1. **Teranet/GeoWarehouse** (Ontario land registry): closings, deeds,
   ownership history → true builder market share, transaction-level property
   profiles, honest pricing models. Expensive, negotiated.
2. **MLS resale comps** (board data agreements) → resale half of CMA
   reports. Same door as the broader MLS-attachment decision.
3. **Parcel/lot data** → lot-size segmentation, lot-premium models.
4. **High-res satellite tasking** → skip; permits win on cost and signal.

## Internal gaps to fix regardless (cheap, compounding)

1. **HISTORY LOG — do first, don't wait for the rest.** Price/status edits
   currently overwrite; there is no change history. A `project_changes`
   append-only table (project_id, field, old, new, changed_at, source)
   written on every price/status mutation starts the "20 years of history"
   clock. Every week unbuilt is data lost forever.
2. **CMA-grade field backfill**: `project_floorplans` had 4 rows and
   `project_incentives` 1 row across 2,100 projects. Extend the
   audit/hero-sourcing pipelines to extract floor-plan pricing + published
   incentives, or the CMA feature compares blank columns.

## Recommended build order (when picked up)

1. History log migration (immediately, independent of the rest).
2. StatCan + CMHC ETLs → demographic + rental data tables.
3. Developer Research module v1 at `/dashboard/research`: market snapshot
   per city (our inventory + census + CMHC), builder rankings, batch PDF
   export. This is a sellable research product with ZERO data licensing.
4. CMA reports v1 (new-construction-only comparisons; resale waits on MLS).
5. Revisit Teranet/MLS licensing from revenue, not hope.

## Monetization note

Research is a developer-side paid product (fits the "monetize builders, not
lead routing" doctrine) and doubles as Launch Services collateral — the
Rescue & Re-Launch diagnostic IS a research report.

# SEO competitor playbook — miamiresidential.com & newhomesource.com

Distilled from the SEMrush exports in [`data/semrush/`](../data/semrush/)
(2026-07-13): two organic-positions exports for miamiresidential.com (by
traffic, by volume), and for newhomesource.com a Top Pages export plus a
positions export filtered to "very easy" keyword difficulty (page 1 of
**1,628** — that filter alone is a target list of ~160k rows).

## How these sites actually earn traffic

**miamiresidential.com** — ~90% of traffic comes from position 1–5 rankings on
low-KD (5–35) *building-name* queries, one dedicated page per building
(`/porschetower` alone owns ~20 name variants including misspellings like
"fendi chateu" / "aqualina"). A `/new-developments/` hub ranks #1–2 for
"new developments miami" category terms. High-volume luxury-brand terms where
they sit at position 20–90 contribute ≈ nothing.

**newhomesource.com** — traffic is a templated geo tree
(`/communities/{state}/{metro}/{city}`) ranking "new homes {city}" (Commercial
intent), with parallel trees by product type (`/condos-townhomes/…`) and
builder (`/builders/…`, `/builder/{name}`), faceted URLs that rank on their
own (`?pricehigh=200000` → "new homes under 200k", `?inventory=true` →
"move-in ready"), and a `/learn/` library that dominates their informational
keywords, referring domains, **and AI-answer citations** (the "LLM Prompts"
column concentrates almost entirely on `/learn/` pages).

**The cautionary tale in both datasets:** low difficulty ≠ ranking. NHS sits
at position 40–90 with 0 traffic on thousands of KD≤14 community names because
the page is a thin duplicate stub — often several stubs cannibalizing each
other ("willow ridge", "mission del lago"). miamiresidential splits
"aston martin residences" across `/astonmartin` and `/aston-martin/`. One
real page per entity, one canonical slug, no thin templated shells.

## What LIQWD already has (validated by this data)

The main build already implements the core playbook: per-project pages with
generated SEO copy + FAQPage schema, city hubs (`/new-homes/{city}`), builder
pages + builder-registry discovery (BILD/HBA directories), sitemap/robots/
IndexNow, calculators and reports as linkable assets. The data confirms these
are the right assets; the items below are the residual gaps.

## Gaps worth building (ranked)

1. **Name-variant coverage per project.** Populate `project_name_alt`
   (marketing name, common misspellings, "{name} {city}" forms) and weave
   variants into title/FAQ/JSON-LD `alternateName`. This is how one page owns
   20 queries. Cheap: extend the SEO-generation prompts + capture alt names at
   discovery/intake time.
2. **Cannibalization audit + slug discipline.** One canonical page per
   project/community; 301 retired slugs; dedupe discovery matches before they
   mint near-duplicate pages. (A recurring query: multiple live URLs whose
   normalized project name collides.)
3. **Type × geo hubs.** `/new-condos/{city}`, `/new-townhomes/{city}` etc. —
   NHS ranks the `/condos-townhomes/` tree separately from `/communities/`.
   Only render where inventory clears a threshold (no thin pages).
4. **Faceted intent pages.** Price-band ("new condos under $500k {city}") and
   move-in-ready/occupancy pages — NHS ranks raw facet URLs for these; clean
   indexable landing pages would beat that. Same thin-page guard.
5. **A `/learn`-style guide library.** NHS's guides are their informational
   traffic, their referring-domain magnets, AND their AI-citation surface
   ("cost to build per sq ft": 1.6K keywords, 186 LLM prompts, 57 ref
   domains). LIQWD seeds exist (per-project buying sections, calculators,
   reports); standalone jurisdiction-aware guides (deposit structures, 10-day
   cooling-off, condo vs townhome, best suburbs of {metro}) compound them.
   "Best suburbs/neighbourhoods {metro}" listicles are their single
   highest-traffic guide format and pair naturally with the existing
   OSM neighbourhood-features data.
6. **Mine the very-easy-KD firehose.** The KD≤14 export (1,628 pages) is a
   ready-made target list: filter to markets with LIQWD inventory, map each
   keyword to the page type above that should own it.

## Sequencing logic (from the difficulty data)

project-name queries (KD ~0–15, first-party data advantage) → city/type/facet
hubs (KD 10–35) → guide library (authority + AI citations) → head terms
("new homes toronto", KD 30–60+) only after referring-domain authority
compounds — NHS's homepage holds 4.2K referring domains; that's what gates
the head terms, not on-page work.

## Ingestion pipeline

Raw pastes are preserved verbatim under `data/semrush/<domain>/raw/` and
parsed with `data/semrush/parse_semrush.py`; see `data/semrush/README.md`
for column semantics and the batch log. Highest-value future pulls: Keyword
Gap vs. an Ontario competitor (BuzzBuzzHome/Livabl/Precondo), backlink
profiles (authority gate), and more pages of the very-easy-KD export.

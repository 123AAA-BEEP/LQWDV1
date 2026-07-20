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

## Addendum: mattamyhomes.com Top Pages (builder-site lens)

Mattamy is the third species of site in the dataset — a **builder's own
domain** — and its traffic shape is the portals' mirror image:

- **~90% of its organic traffic is branded/navigational**: "mattamy homes",
  "mattamy homes {community}", "mattamy homes {city}". The homepage alone is
  25% of traffic (1.1K referring domains). Builders own their brand+community
  queries; they barely register on generic "new homes {city}" terms — those
  belong to the portals. Portals and builders split the SERP; they don't
  really compete.
- **The generic Commercial queries it *does* land come via Google Business
  Profile listings**, not blue links: the URLs tagged
  `?utm_campaign=GBPlisting` are the ones whose top keywords are
  "new homes in fuquay varina nc", "port st lucie new construction",
  "mattamy homes near me". Local-pack/Maps presence is a separate, measurable
  organic channel for "near me"/"new homes {city}" intent — one a portal
  can't fully replicate (no premises), but assigned agents' GBP profiles and
  sales-centre listings can partially capture. It also means some head-term
  SERP real estate is absorbed by the local pack regardless of ranking.
- **Hygiene warning we should not copy:** those GBP UTM URLs are being
  indexed and tracked as separate pages, splitting each community page's
  equity across two URLs. Canonical tags must collapse query-string variants.
- **Deep hierarchy ranks at every level**: state → metro → city → community →
  sub-community/product line (`/tradition/seville`, `/cadence-townhomes`) and
  even single-address pages ("denali drive"). Non-branded sub-community
  queries ("brightmore at wellen park", "telaro at tradition", "avila jensen
  beach") resolve to these deep pages — supports LIQWD's separate-page-per-
  phase/product-line model, and suggests per-model/floor-plan pages have a
  long-tail future.
- **Referring domains concentrate on a few flagship communities** (Island
  Village Celebration 112–120, Brightmore/Wellen Park 137, Waxhaw Landing
  110, Townes at Cheyney 106). Where a builder page has that authority, don't
  fight it for the brand+name query; target the unbranded variants and
  informational angles (pricing, floor plans, FAQ) the builder page is thin
  on. Conversely, projects from small builders with weak sites are where a
  portal page takes position 1 outright — a prioritization signal worth
  joining against the builder registry.
- Their `/ontario/gta` page (142 referring domains, ranks "toronto gta
  housing") is a reminder this export is US-database-heavy; Canada's largest
  builder still concentrates link equity on a GTA hub.

**Net for LIQWD:** project pages should expect to *lose* "{builder}
{community}" to the builder's own site and *win* (a) unbranded
"{community} {city}" variants, (b) comparison/pricing/FAQ intent the builder
page doesn't serve, and (c) everything from builders without real websites.
The builder registry already tracks who's who; a "builder web-strength" flag
would rank every project by how winnable its name queries are.

### Canadian database (Mattamy) — home-market corrections

The Canadian pull confirms the builder-lens findings hold in LIQWD's home
market (branded dominance, GBP-listing URLs carrying "new home construction
in milton" / "new subdivision kitchener" / "new builds brampton"), and adds
four things the US view missed:

- **"{builder} broker portal" is a live query class with dedicated landing
  pages** (`/wildflowers-broker-portal`, `/central-broker-portal` ranking
  "mattamy broker portal"). Agents search for builders' broker portals by
  name. That is LIQWD's own B2B acquisition surface: agent-facing pages
  targeting "{builder} broker portal" / "{builder} agent commission" intent
  are a direct funnel into the product.
- **Incentive/promo pages rank generic terms**: `/promos/government-rebates`
  pulls 792 visits on "hst rebate" (184 keywords); per-metro
  `/promos/quick-move-in-homes` ranks "quick move in homes ottawa"; a solar
  promo ranks "new homes with solar panels". Validates LIQWD's HST-rebate
  calculator and argues for indexable quick-move-in / incentive hub pages.
- **GTA condo pages rank by street address** ("1660 bloor street west" on
  Westbend — 268 keywords; unit-level "603-720 whitlock avenue") and GTA
  condo pages hold the site's biggest referring-domain counts (The Laurels
  199, Blvd Q 175, Clockwork 138). Address queries are a first-class query
  class in the GTA.
- **Founder/entity queries carry real volume** ("peter gilgan" ≈ 1K
  visits/mo to an about page) — builder pages answering "who is behind
  {builder}" capture brand-research intent. A legacy `.aspx` URL still
  ranking is another redirect-hygiene exhibit.

### mycondopro.ca — the small-aggregator floor

The closest structural comparable to LIQWD's public surface (GTA
pre-construction aggregator, one `/project/{slug}` page per project):

- **Address and intersection queries are its entire traffic base**: "270 the
  kingsway", "357 king st w", "brimley and sheppard", "hurontario and
  eglinton", "weston and major mackenzie". With ~zero referring domains it
  still ranks — this query class is effectively uncontested. LIQWD already
  stores `address_full` + `intersection_primary/secondary`; surfacing them
  in titles, H1-adjacent copy, FAQs, and schema is the cheapest coverage win
  available in the GTA.
- **Assignment-sale pages are a distinct intent lane** ("{project}
  assignment", per-bedroom variants) it monetizes with dedicated pages.
- **The cautionary ceiling**: name/address entity pages alone, with no hubs,
  no guides, and no authority, cap out around ~10K visits/mo with the top
  page earning ~116. Entity pages are the floor, not the strategy — hubs,
  guides, and referring-domain growth are what separate NHS-scale from
  mycondopro-scale.

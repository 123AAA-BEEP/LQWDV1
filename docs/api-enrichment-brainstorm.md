# API Enrichment Brainstorm

**What the best public-facing real-estate pages do with APIs — and the free Ontario data to do it with.**

Research brief for the roadmap: city-hub generator → publish-time enrichment (GTFS + StatsCan + schools, free tier first). No implementation here — this is the brainstorm tee-up. Compiled 2026-07-21 from a 13-agent research sweep (competitor clusters + link-verified API sourcing).

---

## TL;DR

1. **The plan is validated by the market leaders.** Every high-value module on UK/AU portals (Rightmove, Zoopla, Domain) is a thin UI over a *free government dataset joined at build time* — sold prices (Land Registry), schools (DfE/ACARA), stations (NaPTAN), demographics (ABS census), catchments (state open data). Monthly/annual cadence, batch-friendly. That is exactly LIQWD's publish-time model.
2. **Nobody in Ontario new-construction does this.** Across BuzzBuzzHome, Livabl, CondoNow, Precondo, NewHomeSource: zero use of GTFS, StatsCan census, or Ontario school open data. CondoNow licenses Walk Score; Precondo hand-types school names into prose. GTFS + census + EQAO enrichment has **no direct competitor** in the niche.
3. **The conversion evidence is strong.** CREA's own pilot found Local Logic hyper-local scores significantly lifted consumers contacting Realtors. Zoopla's TravelTime commute filter drove **+300% conversions** (3× vs distance search). Local Logic's programmatic neighbourhood pages case study: **10× impressions, 2× clicks in 4 weeks**. Location/commute/school enrichment is a lead-gen feature, not decoration.
4. **Almost everything the paid vendors sell is replicable free for Ontario.** Local Logic's 18 scores ≈ GTFS (transit) + OSM Overpass (groceries/parks/cafés) + EQAO open data (schools) + StatsCan (demographics) + road class (quiet). US vendors (GreatSchools, First Street, ATTOM) have zero Canadian coverage anyway — building is forced, and it's also a moat.
5. **Three licensing traps found:** Walk Score's free API **forbids caching/storing scores** (incompatible with publish-time storage — compute your own score instead); **Fraser Institute rankings can't be republished** commercially (HouseSigma was forced to drop them in 2020 and switched to a self-computed EQAO rating — copy that precedent); **no free sold-price data exists in Ontario** (skip AVM/sold-history modules; new-home price lists + CMHC absorbed prices are the substitute).

---

## 1. What the best public pages are doing (by cluster)

### US majors — Zillow, Redfin, Realtor.com, Homes.com

The pattern: **convert every dataset into a branded score, give every geography two pages (inventory + market stats), give away the derived index for backlinks.**

| Module | Who powers it | Notes |
|---|---|---|
| Climate risk (flood/fire/heat/wind/air, 1–10) | First Street (paid) | Zillow **removed it Dec 2025** after MLS/agent revolt — negative scores on listings create channel conflict. Redfin/Realtor.com/Homes.com kept it. |
| School ratings | GreatSchools (paid licence, US-only) | Boundaries come from a *separate* vendor (Maponics → Precisely). Homes.com added its **own** A+–D score computed from free state test data to cut vendor dependence. |
| Walk/Transit/Bike Score | Walk Score API (owned by Redfin; Zillow licenses it anyway) | Free tier 5,000 calls/day covers Canada — but ToS forbids storing scores. |
| Commute times | TravelTime API (Realtor.com — confirmed by vendor case study) | Free/open equivalent: OpenTripPlanner over GTFS. |
| Noise | HowLoud Soundscore (Homes.com) | Realtor.com's vendor undisclosed. |
| AVM / market pages | In-house (Zestimate, Redfin Estimate); Realtor.com shows *three* licensed AVMs for trust | Off-market address pages = the SEO surface. |
| Market indices | In-house (ZHVI, Market Hotness, Compete Score) — **given away free**, mirrored on FRED | Deliberate citation/backlink engine. |

**SEO consensus:** strict geo hierarchy (state → metro → city → neighbourhood) with breadcrumb JSON-LD; every geography gets an inventory page *and* a `/housing-market` stats page; year-stamped titles ("2026 Boston Housing Market"); numeric-ID+slug URLs to avoid name collisions; free downloadable data as a press machine.

Also instructive: Realtor.com **removed** its crime map (Dec 2021, bias concerns) — the industry avoids property-level crime and negative scoring.

### Canadian resale — Realtor.ca, HouseSigma, Zolo, Wahi, Condos.ca

- **Realtor.ca**: neighbourhood scores powered by **Local Logic** (Montreal) since June 2018 — 18 scores in 3 buckets (Transportation / Services / Character), computed per-address, displayed /10. CREA's pilot measured a significant lift in consumers contacting Realtors. This is the strongest public evidence that neighbourhood enrichment drives *leads*.
- **HouseSigma**: sold data via brokerage VOW feeds (login wall = legally required *and* their lead engine); signature "Market Temperature" (absorption rate) metric; **dropped Fraser Institute rankings Nov 2020 over copyright, replaced with own 10-point rating from 5 years of raw EQAO open data** — the key legal precedent for LIQWD's school module.
- **Zolo**: cleanest URL grammar (`/{city}-real-estate` → `/trends`, `/sold` suffixes at every geo level, generated down to villages); demographics **directly from StatsCan census** on every city hub — proof the census-at-publish-time plan is production-normal.
- **Wahi**: pays Local Logic for scores + **66%-unique licensed text** (duplicate-content protection); "Where-to-Live Rankings" — one scored dataset → hub + per-region pages + one article per category + monthly press release (content flywheel).
- **Condos.ca**: owns one metric ($/sqft, from normalized square footage) as brand identity; building-level profile pages with trailing-12-month PSF trend and rank-vs-area; rankings pages at every geography level.

### New-construction directs — BuzzBuzzHome, Livabl, NewHomeSource, CondoNow, Precondo

Your actual SERP competitors (note: Zonda owns BuzzBuzzHome + Livabl + NewHomeSource; their Canadian surfaces look under-maintained with a `/ca/`–`/us/` duplicate-canonical mess — **CondoNow and Precondo are the real Ontario competition**).

- **BuzzBuzzHome/Livabl**: city/neighbourhood "place" pages carry an auto-computed stats block from their own DB (units under construction, # of projects, median $/sqft, most active developer) — unique self-refreshing SEO text at zero external cost. Per-floor-plan indexable URLs. Deposit structures published but as **unstructured prose**.
- **Livabl**: static-path facet pages (`/toronto-on/new-homes/under-500k`, `/new-condos`, `/new-quick-move-in-homes`) at metro/city/neighbourhood tiers, each with its own computed stats paragraph. **No Walk Score, no transit, no schools, no census anywhere** — enrichment is purely their own inventory.
- **NewHomeSource** (US): schools as module *and* filter (`?schooldistrictid=` pages get indexed); commute calculator; TrustBuilder first-party verified builder reviews (E-E-A-T moat); two-tier listing pages (rich claimed vs auto-generated basic).
- **CondoNow**: the most enrichment-forward Canadian player — Walk Score as project module *and* facet landing pages (`/Toronto-New-Condos-Walk-Score`); **structured deposit % filter with named landing pages** (`/Five-Percent-Down-Condos`); per-project sub-pages (`/Floor-Plan-Price`, `/Neighbourhood`, `/Promotion`) = 3–4 indexed URLs per project; ungated floor-plan pricing as differentiator; address-anchored compare pages.
- **Precondo**: one-person SEO machine — year-stamped titles, FAQ blocks tuned for featured snippets, neighbourhood hubs with $/sqft ranges in prose, a `/llm-info` page for AI answer engines, Walk Scores transcribed editorially.

**Cluster verdict:** city-hub market stats are always computed from the portal's own DB; external data usage is thin (Walk Score + a maps API); deposit structure is the most differentiating field and nobody stores it structured.

### International best-in-class — Rightmove, Zoopla, OnTheMarket, Domain, realestate.com.au

- **Rightmove**: sold-price pages down to street level from one free monthly government CSV (with Crown-copyright attribution printed on-page — attribution as trust signal); school checker (DfE register via Experian); broadband speed badge; `/new-homes-for-sale/{City}.html` pages = your city-hub concept validated at national scale.
- **Zoopla**: page-per-address AVM (~30M pages); TravelTime isochrone commute search (**+300% conversions**); **EPC government-register fallback** — when the agent doesn't supply a data point, auto-fill from the open register and label the source (great pattern for missing builder specs); HTML sitemap hub pages for crawlability.
- **Domain (AU)**: **school catchment polygons from state open data** as map overlay + search-by-catchment — highest-salience family feature, entirely free data; suburb profile template (median by type/beds + trend + census demographics + neighbouring-suburb links) maps 1:1 to StatsCan; annual "School Zones Report" data-mashup for press.
- **realestate.com.au**: nearest schools via the free government ACARA list (radius query at publish time — exactly the LIQWD school plan); brands its data layer ("PropTrack") so free-data modules look proprietary and quotable.

**Ontario mapping of every module:** ABS/UK census → StatsCan Census Profile ✓ free. ACARA/GIAS schools → Ontario SIF open data + EQAO ✓ free. NaPTAN stations → GTFS ✓ free. Ofcom broadband → ISED broadband open data (to verify). AU catchments → per-board only, no province-wide dataset (a data-aggregation moat opportunity). UK sold prices → **no free Ontario analog** (Teranet/MPAC/TRREB all paid/restricted — skip).

### The vendor layer — what portals buy vs. what's replicable

| Vendor | Sells | Free Ontario replication |
|---|---|---|
| Local Logic (~$100+/mo entry) | 18 location scores, 90k neighbourhood text profiles, demographics, school data | GTFS + OSM + EQAO + StatsCan + LLM-generated text seeded with real stats |
| Walk Score | 0–100 scores; free tier **forbids caching** | Own score from OSM amenities + network distance decay (methodology is public and academically replicated) |
| GreatSchools | 1–10 US school ratings (cheap tiers only get 3 bands) | Own EQAO-derived score (HouseSigma precedent) |
| First Street | Probabilistic climate risk — genuinely not replicable | Don't try; area-level flood mapping (conservation authorities) as boolean flag if ever needed, framed carefully |
| TravelTime | Transit isochrones/commute search | OpenTripPlanner 2 or MOTIS self-hosted over GTFS + OSM, batch at publish |
| ATTOM / Precisely | US property spine, boundaries, demographics | US-only; StatsCan + municipal open-data boundaries cover the need |

**Buy-vs-build verdict:** for Ontario, building is *forced* (US vendors have no coverage) and the publish-time architecture makes even the compute cheap — batch once, store in Supabase, render at ISR.

---

## 2. Idea board for LIQWD (ranked, mapped to the roadmap)

### Tier 1 — city-hub generator, own data only (zero external dependencies)

1. **Stats block per city hub** computed from the projects DB: active projects, units by status, median $/sqft by type, most active builders, upcoming occupancies. (BuzzBuzzHome/Livabl pattern — unique, self-refreshing SEO text.)
2. **URL grammar**: `/{city}-new-homes` hub + `/trends` suffix + per-project pages; static-path facets for price band (`/under-500k`), type, occupancy year, status ("completing 2027"), quick move-in. (Zolo + Livabl + CondoNow consensus.)
3. **Year-stamped, count-stamped titles**: "2026 Milton New Construction Market — 14 Projects". Trivial at build time; wins freshness CTR (HouseSigma/Zolo/Precondo/Redfin all do it).
4. **Three-tier geo hierarchy with breadcrumb JSON-LD** (province → region/metro → city → project) and hub↔child interlinking; ranked "best/newest/lowest-deposit in {city}" tables as the linkable asset.
5. **Structured deposit data** (milestone % + day offsets, not prose) → comparison tables + "5% down new homes in {city}" facet pages. Nobody in the cluster stores this structured; cheapest genuine differentiator.
6. **Keep sold-out/past project pages live** with final-pricing history (the off-market-page pattern: maximize indexable surface).

### Tier 2 — publish-time enrichment (the queued GTFS + StatsCan + schools work)

7. **Transit module** per project + city hub: 3 nearest stops with walk distance, routes serving them, peak frequency, and precomputed **"X min to Union / nearest GO station"** badges. (Rightmove stations widget + the TravelTime 3×-conversion feature, on free GTFS.)
8. **Census demographics strip** per city hub: population + growth vs 2016, median household income, age mix, owner/renter split, commute mode, dwelling-type mix. (Exactly what Zolo ships; what US portals pay vendors for.)
9. **School module**: nearest N schools from provincial open data (name, board, level, language, distance) + **a LIQWD-branded score computed from raw EQAO fields** + "check your catchment" deep link to the board locator. Closes the no-GreatSchools-in-Canada gap; legally clean per HouseSigma precedent.
10. **Location scorecard** (Local Logic clone): 0–10 scores for transit, groceries, parks, cafés/restaurants, schools, quiet — from GTFS density/frequency + OSM POIs + road class. Computed per project address so neighbouring projects differentiate. 3-bucket presentation, omit scores with thin data.
11. **LLM-generated unique city/neighbourhood descriptions seeded with the real computed stats** (Wahi paid for 66%-unique vendor text; generation at build achieves the same thin-content protection free).
12. **CMHC freshness layer**: monthly starts/completions + annual rents/vacancy per CMA via the StatsCan-hosted tables (safest licence path). Positions hubs as market reports, not brochures.

### Tier 3 — differentiators nobody has

13. **Station-anchored programmatic pages**: "New homes near {GO station / subway stop}" — CondoNow's address-anchored pattern fused with GTFS station data. Page type that doesn't exist yet in Ontario.
14. **Demand badges from LIQWD's own exhaust**: most-viewed projects per city, lead volume, price-list revisions, absorption — the Zillow/Redfin/CREA "own-analytics moat" pattern; no competitor can copy it.
15. **Supply-pipeline module from municipal development-application open data** (Toronto/Ottawa/Hamilton/Mississauga publish these): "what's coming next in {city}" — high-value for new-construction context and a press angle.
16. **Annual data-mashup report** ("Ontario New Home Supply Index" per city, or "GTA new-home prices near top-EQAO schools") released as CSV + press note — the ZHVI/Domain-School-Zones backlink play at micro scale.
17. **`/llm-info` + heavy schema.org** so AI answer engines cite LIQWD (Precondo is already doing this).
18. **Freemium report funnel**: enrichment public and crawlable; one high-value item (full price list / incentives / detailed area PDF) behind email. The whole Canadian cluster monetizes this way.

### Skip list (evidence-based)

- **AVM / sold-price history** — no free Ontario data; VOW requires brokerage licensing.
- **Fraser Institute scores on-page** — copyright enforcement precedent; link out or compute own EQAO score.
- **Walk Score API for stored enrichment** — caching prohibited on free tier; build own score.
- **Property-level climate/crime scores** — Zillow's Dec-2025 climate retreat and Realtor.com's crime-map removal show negative scoring creates broker channel conflict. For new construction, frame positively (current building code, new infrastructure) if touched at all.

---

## 3. The API catalogue (link-verified, free-tier-first)

Every URL below was checked by a verification pass (live fetch or current search-index corroboration; the sandbox proxy blocked some direct fetches — flagged where relevant). **Spot-check the load-bearing download links in a browser before wiring anything.**

### 3.1 GTFS / transit

| Source | Link | Access | Notes |
|---|---|---|---|
| **Mobility Database** (start here) | https://mobilitydatabase.org/ — catalog CSV: `https://storage.googleapis.com/storage/v1/b/mdb-csv/o/sources.csv?alt=media` — daily feed copies: `https://storage.googleapis.com/storage/v1/b/mdb-latest/o/{feed-id}.zip?alt=media` | Free, **no auth** for catalog + hosted zips | Verified HTTP 200 for TTC, GO, MiWay, YRT, DRT, Brampton, OC Transpo, HSR, London, GRT-legacy. One nightly job covers all Ontario static GTFS. |
| TTC | https://open.toronto.ca/dataset/ttc-routes-and-schedules/ (+ merged-GTFS variant; RT: https://bustime.ttc.ca/gtfsrt/) | Free, no key | OGL–Toronto: commercial use OK with attribution. |
| Metrolinx / GO + UP | https://www.metrolinx.com/en/about-us/open-data — GO zip: `https://assets.metrolinx.com/raw/upload/Documents/Metrolinx/Open%20Data/GO-GTFS.zip` | Free (RT API needs free registration) | **Attribution legend required verbatim:** "Data used in this product or service is provided with the permission of Metrolinx". Highest-value single feed for GTA suburbs. |
| MiWay | https://www.mississauga.ca/miway-transit/developer-download/ | Free, no key | GTFS + GTFS-RT. |
| Brampton | https://geohub.brampton.ca/pages/brampton-transit | Free, no key | Includes Züm. |
| YRT | https://www.yrt.ca/en/about-us/open-data.aspx | Free; one-time click-through licence | Use the Mobility Database mirror to avoid the form in automation. |
| Durham DRT | https://www.durhamregiontransit.com/en/about-us/region-of-durham-open-data-program.aspx | Free, no key | |
| OC Transpo | https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/ | Static free; RT needs free key | Commercial use explicitly allowed. |
| Hamilton HSR | https://open.hamilton.ca/datasets/6eeccf172c824c2db0484aea54ed7fe4 | Free, no key | |
| London LTC | https://www.londontransit.ca/open-data/ | Free, no key | Most permissive agency licence found. |
| Waterloo GRT | https://www.grt.ca/en/about-grt/open-data.aspx (feeds: `https://webapps.regionofwaterloo.ca/api/grt-routes/`) | Free, no key | New split feeds (bus / ION) are missing from the Mobility DB mirror — fetch direct. |
| **OpenTripPlanner 2** (transit isochrones) | https://docs.opentripplanner.org/en/latest/ | Free, self-hosted | The only free transit-aware isochrone engine. Run in CI at publish, batch-query, tear down. LGPL; outputs need agency + OSM attribution. |
| Valhalla (walk isochrones) | https://valhalla.github.io/valhalla/ (public instance: https://valhalla.openstreetmap.de/) | Free (self-host for production) | MIT; pair walk-times with GTFS stop data. |
| OpenRouteService | https://openrouteservice.org/ (limits: https://openrouteservice.org/restrictions/) | Free key: ~2,500 req/day, 500 isochrones/day | **Results are CC BY 4.0 — clean to display commercially.** Best no-infra option. |
| Geoapify Isoline | https://apidocs.geoapify.com/docs/isolines/ | Free: 3,000 credits/day | Caching allowed; needs "Powered by Geoapify" link on free plan. |
| Transitland v2 | https://www.transit.land/documentation/rest-api/ | Free key, low rate limit | Dev convenience / cross-agency IDs; not a production dependency. |
| ⚠️ OSRM demo server / Transitous | https://github.com/Project-OSRM/osrm-backend / https://transitous.org/api/ | Free | **Both non-commercial policies** — self-host only for LIQWD. |

### 3.2 Statistics Canada + CMHC

| Source | Link | Access | Notes |
|---|---|---|---|
| **Census Profile bulk download** (start here) | https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger.cfm?Lang=E (Ontario DA-level slice: `GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=006_Ontario`) | Free, anonymous | One download → load into Supabase → all enrichment becomes a local SQL join. Census is static until ~2027, so bulk-once is the right architecture. |
| Census boundary files | https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21 | Free | Load DA/CT/CSD polygons into PostGIS (Supabase supports it) → free offline lat/lng→geography lookup. Avoids the paid PCCF entirely. |
| Geographic Attribute File (hierarchy crosswalk) | https://www12.statcan.gc.ca/census-recensement/2021/geo/aip-pia/attribute-attribs/index-eng.cfm | Free | Enumerates "all DAs/CTs inside city X" — the skeleton for the city-hub generator. |
| Census Profile SDMX API (spot queries) | https://www12.statcan.gc.ca/wds-sdw/2021profile-profil2021-eng.cfm — endpoint `https://api.statcan.gc.ca/census-recensement/profile/sdmx/rest/` | Free, **no key** | Dataflows: DF_PR/DF_CSD/DF_CT/DF_DA/DF_FSA. Working reference implementation: `cancensus` R package wds.R. |
| geo.statcan ArcGIS services (point→DA lookup) | https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Cartographic_boundary_files/MapServer | Free, no key | Batch OK; don't build live traffic on it. |
| StatsCan WDS (time series) | https://www.statcan.gc.ca/en/developers/wds/user-guide — base `https://www150.statcan.gc.ca/t1/wds/rest/` | Free, no key (25 req/s/IP) | Channel for CMHC tables + population estimates. |
| **CMHC via StatsCan tables** (safest licence) | Rents 34-10-0133: https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410013301 · vacancy 34-10-0127 · starts 34-10-0156 / 34-10-0148 (by market type incl. condo) | Free | Pulled from StatsCan ⇒ StatsCan Open Licence applies (not CMHC's revocable one). |
| CMHC HMIP (zone-level detail) | https://www03.cmhc-schl.gc.ca/hmip-pimh/en | Free, no key | Zone-level rents + **absorbed new-unit prices** (very relevant). Unofficial API, revocable licence — enhancement, not dependency. |
| StatsCan Open Licence | https://www.statcan.gc.ca/en/terms-conditions/open-licence | — | Commercial republish + sell explicitly allowed. Footer: "Source: Statistics Canada, Census Profile, 2021 Census of Population." / "Adapted from…" for derived stats. |
| ⚠️ PCCF (postal→census) | https://www150.statcan.gc.ca/n1/en/catalogue/92-154-X | **Paid** (Canada Post) for commercial use | Avoid: you have project lat/lng — point-in-polygon on free boundary files instead. |

### 3.3 Ontario schools

| Source | Link | Access | Notes |
|---|---|---|---|
| **School Information & Student Demographics (SIF)** (the backbone) | https://data.ontario.ca/dataset/school-information-and-student-demographics | Free XLSX, annual | One file: every publicly funded school with **lat/lng, board, level, language, enrolment, EQAO results (Gr 3/6/9, OSSLT), demographics**. OGL–Ontario ⇒ commercial display OK with attribution. ~1.5–2 yr lag; small-school suppression. |
| Public school contact info (monthly refresh) | https://data.ontario.ca/dataset/ontario-public-school-contact-information | Free, monthly | Keeps names/addresses/websites current between SIF releases; join on board # + school #. No lat/lng — join to SIF. |
| Board achievements & progress | https://data.ontario.ca/dataset/school-board-achievements-and-progress | Free, annual | Board-level graduation rates etc. — context lines for city hubs. |
| OGL–Ontario licence text | https://www.ontario.ca/page/open-government-licence-ontario | — | Attribution: "Contains information licensed under the Open Government Licence – Ontario." |
| School board boundaries (GeoHub/LIO) | https://geohub.lio.gov.on.ca/datasets/school-board-boundaries/about | Free | Board *districts*, not catchments. **Confirmed: no province-wide catchment dataset exists** — per-board only. |
| Board locators (catchment lookups) | TDSB https://www.tdsb.on.ca/Find-your/School/By-Map · Peel https://www.peelschools.org/school-finder · YRDSB https://schoollocator.yrdsb.ca/ | Free interactive, **no bulk/API** | Board sites are ordinary copyright — link out ("check your catchment"), don't scrape polygons. |
| EQAO direct | https://www.eqao.com/results/ (dashboards: https://www.eqao.com/interactive-dashboards/) | Free to view; no open licence | Freshest year (2024-25) but Crown copyright / non-commercial default ⇒ **link-only**; republish numbers from the OGL catalogue copies instead. |
| ⚠️ Fraser Institute rankings | https://www.compareschoolrankings.org/ (note: `.org`, not compareschools.ca) | Free to view; **CC BY-NC-SA / all-rights-reserved PDFs** | Cannot republish scores commercially without a negotiated licence (HouseSigma precedent; Wahi/OJO licensed it). Link out, or compute an own score from SIF EQAO fields. |

### 3.4 Adjacent free enrichment

| Source | Link | Access | Notes |
|---|---|---|---|
| City of Toronto Open Data | https://open.toronto.ca/ | Free CKAN API, no key | Parks, zoning, neighbourhood profiles, **development applications (24k+), building permits (196k+)**. OGL–Toronto, commercial OK. |
| Ontario GeoHub (LIO) | https://geohub.lio.gov.on.ca/ | Free | Province-wide boundaries/roads/parks — the fallback layer for every small municipality with no portal. |
| OSM Overpass API | https://wiki.openstreetmap.org/wiki/Overpass_API (endpoint: https://overpass-api.de/api/interpreter) | Free, ~10k req/day fair use | Nearby amenities province-wide. ODbL: "© OpenStreetMap contributors" attribution; keep stored extracts minimal (share-alike). Scale path: Geofabrik Ontario `.osm.pbf` extract. |
| ECCC weather/climate (GeoMet) | https://api.weather.gc.ca/ (collections: climate-normals, climate-stations) | Free, no key | "Climate at a glance" block; one fetch per city, static normals. |
| Toronto Police open data | https://data.torontopolice.on.ca/ | Free | Neighbourhood crime rates, quarterly, OGL. Toronto-only; **decide presentation policy deliberately** (steering optics). |
| Nominatim geocoding | policy: https://operations.osmfoundation.org/policies/nominatim/ | Free, 1 req/s, UA required | Caching results is *required* by policy — publish-time model is naturally compliant. Weak on brand-new addresses. |
| Geoapify (geocoding + Places) | https://www.geoapify.com/pricing/ | Free 3,000 credits/day | Managed fallback for both Nominatim and Overpass; commercial OK with "Powered by Geoapify" link. |
| Walk Score API | https://www.walkscore.com/professional/api.php | Free 5,000 calls/day | ⚠️ Every displayed score must link back to WalkScore.com; **storage/caching restrictions — read the agreement before persisting anything**. Prefer own score. |
| Ottawa / Hamilton / Mississauga open data | https://open.ottawa.ca/ · https://open.hamilton.ca/ · https://data.mississauga.ca/ | Free | All have development-application datasets. Mississauga's exact licence text unverified — confirm before republishing. |
| NRCan Geolocator | https://natural-resources.canada.ca/maps-tools-publications/satellite-elevation-air-photos/geolocation-service | Free | Place/FSA level only (city centroids); legacy API sunsets 2027-03-31. |
| ⚠️ geocoder.ca | https://geocoder.ca/?terms=1 | **Not free commercially** | Common trap — skip. |
| ⚠️ Canada Post AddressComplete | https://www.canadapost-postescanada.ca/ac/pricing/ | Paid | Only relevant later for lead-form UX. |

---

## 4. Licensing cheat-sheet (what can go on a public commercial page)

| Data | Verdict | Required attribution |
|---|---|---|
| StatsCan census (all channels) | ✅ Yes, incl. derived stats | "Source: Statistics Canada, Census Profile, 2021 Census of Population." |
| CMHC via StatsCan tables | ✅ Yes | StatsCan notice (safest path) |
| CMHC HMIP direct | ✅ but licence is *revocable* | "Source: Canada Mortgage and Housing Corporation (CMHC), [product], [date]" |
| Agency GTFS (all Ontario) | ✅ Yes | Per-agency OGL attribution; **Metrolinx legend verbatim** |
| Ontario school SIF/EQAO fields (via data.ontario.ca) | ✅ Yes | "Contains information licensed under the Open Government Licence – Ontario." |
| EQAO.com content directly | ❌ Link-only | — |
| Fraser Institute scores | ❌ Without a negotiated licence | Link-only, or compute own EQAO score |
| OSM-derived (Overpass, Nominatim, routing outputs) | ✅ Yes | "© OpenStreetMap contributors" → openstreetmap.org/copyright; minimal stored extracts |
| Walk Score | ⚠️ Display OK with link-back + branding; storage restricted | Prefer own score for publish-time model |
| Municipal open data (Toronto/Ottawa/Hamilton/TPS) | ✅ Yes | Per-city OGL line (Mississauga: confirm text) |
| Board catchment maps/locators | ❌ Republishing polygons | Deep-link out instead |

Pattern from the leaders: print the attribution *visibly* (Rightmove prints the Crown-copyright line on every sold-price page) — it's compliance **and** a credibility signal.

---

## 5. Open items & gaps (the critic pass)

The workflow's final gap-critic agent died on a rate limit; these are the gaps identified manually:

1. **Broadband availability badge** — Rightmove-proven module; the Ontario equivalent (ISED National Broadband Internet Service Availability open data / CRTC) was *not* link-verified in this sweep. Worth one follow-up lookup.
2. **Flood/hazard layers** — conservation-authority regulated-area maps and Ontario GeoHub flood hazard data exist but weren't fully sourced; only relevant if we ever touch risk display (see skip-list caution).
3. **Three unverified details to check in a browser before any build**: Mississauga open-data licence text; Walk Score API storage clause; the exact SIF XLSX download link (sandbox egress blocked some direct fetches — all links were verified via live search-index corroboration instead).
4. **No free sold-price source exists** for Ontario — reconfirmed; any "value" story must come from builder price lists + CMHC absorbed prices.
5. **Catchment data** — genuinely fragmented (per-board, unlicensed). Aggregating it by hand would be a moat but is a licensing minefield; the nearest-schools + locator-link pattern is the clean v1.

---

## 6. Questions to riff on in the brainstorm

1. **Which single enrichment ships first on city hubs?** Evidence says transit ("X min to Union" badges) has the strongest conversion proof; census demographics is the cheapest (one bulk file, local joins); schools has the most emotional pull and the clearest competitive gap.
2. **Do we brand the data layer?** ("LIQWD Data" / a named score, PropTrack-style) — one signature metric (e.g., new-home $/sqft premium vs city, or per-city absorption) is cheap and citable.
3. **Where does the login wall go?** The Canadian pattern: enriched page fully public and crawlable; one high-value number (full price list / incentives) behind email.
4. **Deposit structures**: worth the schema work to store milestones structured from day one? (Enables the facet pages nobody else can build.)
5. **How aggressive on programmatic scale?** Zolo generates pages for villages of 1,300 people and they rank unopposed. Every Ontario municipality, or top-N cities first?
6. **Station-anchored pages** ("new homes near {GO station}") — v1 of the city-hub generator or a fast-follow?

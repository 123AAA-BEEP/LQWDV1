# Project data sources — source of truth for finding & verifying new projects

This is the canonical list of where LIQWD discovers, back-fills, and verifies
new pre-construction projects (the building facts AND the hero rendering).
When you find a new project to add — or need to confirm details on an existing
draft — work this list top to bottom. Add new sources here as we find them.

> Sandbox note: this environment **cannot** fetch arbitrary external pages
> (network policy — builder sites, aggregators, even Wikipedia 403). `WebSearch`
> works for discovery; the actual page/image *fetch* runs off-box in the
> `liqwd-source-hero` Supabase Edge Function. See
> `docs/auto-hero-sourcing-runbook.md` for the fetch+verify+publish loop.

## What "verified" means
- **Facts** (builder, city, type, units, storeys, price-from, occupancy): two
  independent sources agree, OR it comes straight from the builder / official
  VIP broker portal. Provenance goes in admin-only `import_notes`.
- **Hero image**: a real exterior / interior / aerial **rendering or photo of
  the actual building/community** — never a logo, floor plan, site map, lifestyle
  stock, or a brokerage's generic banner. Always visually confirm before publish.
  (E.g. Harbour Marketing's gated `/account/*` pages serve their house logo as
  `og:image` — that is NOT a hero. Reject it.)

## Primary sources

### 1. Builder / developer sites & official VIP broker portals
The most authoritative source — straight from the builder. Many small "coming
soon" launches exist **only** here. Use the project's own broker portal
(stored per-project in `project_broker_portals`) first.

- **Harbour Marketing** — `https://www.harbourmarketing.ca`
  - VIP broker portal for many GTA launches; frequently the only page that
    exists for a minimal "coming soon" project. Good `og:image` renderings on
    the **public** project pages (`/<projectname>`, `/project-<name>`).
  - ⚠️ The login-gated `/account/<name>` pages fall back to the Harbour logo as
    `og:image` — do not use that as a hero; find the public page or another source.
- **Capital North Realty — New Developments** —
  `https://capitalnorthrealty.com/residential-real-estate/new-developments`
  - Brokerage roundup of current GTA new-development launches; good for
    discovering projects + cross-checking builder / location / status.
- _(add more builder/brokerage portals here as we collect them)_

### 2. Listing aggregators (rich pages, usually a hero rendering as og:image)
Used by the hero-sourcing pipeline (`candidatePageUrls` in `src/lib/hero-sourcing.ts`).
- **gta-homes.com** — `/<city>-condos/<name>/` and `…-towns/`
- **condonow.com** — `/<Name-Dashed>` and `…-Towns`
- **tallproperty.com** — `/property/<name>-by-<builder>-in-<city>/`
- Also useful via `WebSearch`: condonow, newinhomes.com, livabl.com, condoroyalty,
  therealtybulls, condoroyalty, homebaba, buzzbuzzhome.

### 3. Discovery engine (automated — Admin → Discovery)
"Addresses lead, names trigger." Tables: `discovery_watch` (address-first),
`discovery_signals` (name-bearing), `discovery_builders` (known universe).
Daily cron `/api/cron/discovery`; manual/probe runs via
`/api/discovery/sweep?key=…&source=…[&probe=1][&ui=1]`.
- **Toronto Open Data — Development Applications** (CKAN, weekly): OPA /
  rezoning / site-plan applications → watchlist rows with address, units,
  storeys, months-to-years before marketing exists.
- **UrbanToronto database** — `https://urbantoronto.ca/database/projects`
  (daily): name + address + developer + storeys/units per project. The
  cross-reference starting gun: a UT name matching a watched address publishes
  immediately through the intake pipeline (research → SEO → IndexNow).
- **BILD member directory** — `https://bildgta.ca` (weekly): the GTA
  builder/developer census → `discovery_builders`; also seeded from our own
  `projects.builder_name`. A known builder boosts signal confidence.
- **Meta ads**: no public API for Canadian housing ads — forward ad creatives
  to the intake inbox (the Summerhill flow); they ride the same pipeline.

### 4. Bulk import provenance (already in the DB)
- **Altus** inventory — the ~1,145-project bulk import. Dedup key is the Altus
  inventory # (stored in admin-only `import_notes`). Same name+city can be
  legitimately separate phases — don't blind-dedup.
- **livabl** — small early seed batch.

## Workflow for adding a NEW project found via these sources
1. **Dedup first** — search `projects` by name + city (and builder). A close
   match may be an existing draft/published record or a legit separate phase.
2. **Create / enrich** the `projects` row (draft, `public_page_enabled=false`),
   filling builder, city, type, units, storeys, price-from, occupancy, and the
   provenance URL in `import_notes`.
3. **Attach the broker portal** in `project_broker_portals` (status `approved`).
4. **Source + verify the hero** via the runbook loop, then publish (set hero,
   `record_status='published'`, `public_page_enabled=true`, create/activate the
   `public_project_pages` row with content sections).

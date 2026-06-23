# CondoRoyalty → LIQWD enrichment pipeline

CondoRoyalty (a WordPress site) is used to **enrich the existing
`external_source='Altus Group'` projects**, not to bulk-insert new ones. Altus
holds ~481 distinct active GTA projects with addresses/prices/sales-status but
**no geo, no neighbourhood, and no descriptions** — CondoRoyalty fills those
gaps for the projects that overlap.

## Provenance / anonymization

Per policy, the string "condoroyalty" never enters the database. Enriched rows
are tagged `external_source` stays `'Altus Group'` and `import_notes` carries
`[geo/nbhd enriched from gta_seed]`. The real source URLs live only in
`out/_private_source_map.csv` (gitignored).

## Data (regenerable, gitignored under `out/`)

`scrape.py` produces `out/review.csv` (one row per CondoRoyalty project) and
`out/images.csv` (every hero/gallery/floorplan image + dimensions). Re-runnable
any time (`condoroyalty.com` is allowlisted): `python3 scrape.py --all --with-images --max-measure 6`.

## Phases

| Phase | What | Status |
|---|---|---|
| 0 | Scrape CondoRoyalty → review.csv + images.csv | ✅ done (regenerable) |
| 1 | Match CR→Altus, fill **geo + neighbourhood** (NULL-only, non-destructive) | ✅ **applied: 380 rows / 140 distinct projects** |
| 2 | Re-host matched images (WebP, stripped metadata) → `project_media_candidates` for admin review | ⛔ needs Supabase creds + Storage |
| 3 | Location-aware AI descriptions (OSM POIs → Sonnet 4.6 via `seo_prompt_settings`) | ⛔ needs OSM allowlist + Anthropic key |

**Matching** = exact normalized name + compatible city family (Toronto
amalgamation handled) + CondoRoyalty geo inside a GTA bounding box. Of 2,393
scraped CR projects, ~140 match Altus high-confidence; the ~2,060 non-matches
are the old/completed long tail and are **not** imported.

## Phase 1 — done, and how to reverse it

Applied via `enrich.py` logic (this run was executed directly against the DB).
Re-run idempotently with credentials:

```bash
pip install supabase
export NEXT_PUBLIC_SUPABASE_URL=https://mzdqlhopxfknwqxxuonn.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...        # Supabase dashboard → Project Settings → API
python3 enrich.py            # dry run
python3 enrich.py --apply    # writes NULL-only geo/neighbourhood
```

Reverse (if ever needed) — the tag makes it safe to target:

```sql
update public.projects
set latitude=null, longitude=null, neighbourhood=null,
    import_notes=replace(import_notes,' [geo/nbhd enriched from gta_seed]','')
where external_source='Altus Group' and import_notes like '%gta_seed%';
```

## Prerequisites to run Phases 2–3

1. **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
2. **Network allowlist:** `nominatim.openstreetmap.org`, `overpass-api.de`

Phase 3 generates `seo_title` / `seo_meta_description` / sectioned
`page_description` strictly from verified facts + OSM POIs (computed distances,
never guessed); any section without verified data is omitted.

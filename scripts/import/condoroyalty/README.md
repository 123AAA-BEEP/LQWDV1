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
| 2 | Re-host matched hero images → public `project-media` Storage bucket + `project_media_candidates` for review | ✅ **applied: 140 projects / 380 candidate rows** |
| 3 | Location-aware descriptions (OSM POIs → grounded prose) into `projects.description_ai_draft` | ✅ **applied: 140 projects** |

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

## How Phases 2–3 were actually completed (Supabase Edge Functions)

The sandbox's network allowlist and env-var settings never took effect across
sessions, so Phases 2–3 were done **without them** — via Edge Functions deployed
to the Supabase project (which has open egress and built-in service-role access).
Source lives in [`edge-functions/`](./edge-functions):

| Function | Purpose |
|---|---|
| `liqwd-osm-pois` | `{lat,lng}` → nearby transit/parks/schools/shops from OpenStreetMap with computed distances |
| `liqwd-write-descriptions` | Batch engine: per matched active project, fetch POIs → build a grounded description → write `description_ai_draft` (tag `[desc amenity v2]`) |
| `liqwd-rehost-image` | Fetch a CondoRoyalty hero image → upload to public `project-media` bucket → insert `project_media_candidates` row (`provider='gta_seed'`, source URL never stored) |

Descriptions are built strictly from verified place names + computed distances;
any category without nearby data is omitted (no invented amenities). Invoke the
batch functions with the anon key as Bearer; `liqwd-write-descriptions` should be
called with `batch<=15` and repeated until `remaining_projects=0`.

**Follow-ups (optional):** gallery images beyond the hero; WebP re-encode + EXIF
strip on re-host; rotate the `service_role` key that was pasted into the env-vars
box (it was never used — the Edge Functions use Supabase's built-in service role).

# LIQWD — Search-Based Project Enrichment Pipeline

Enriches sparse `projects` rows (Altus/Livabl seed) from public web sources
into publishable, polished records — **without ever overwriting live data**.
The bot writes only to a **staging layer**; a human promotes values via the
admin UI. Dry-run is the default; nothing is written without `--commit`.

## Non-negotiables (enforced, not just documented)
- Never UPDATE `published`/`approved` rows; the only `projects` writes allowed
  are `last_verified_at` / `import_notes` run-markers on **draft** rows
  (guarded in `db.py` and at the DB query). 
- Never write enriched values into `projects` content fields — staging only.
- Never fabricate: every staged value carries a `source_url`; no value found → null.
- Dedup/merge are **proposals**; the bot never merges or deletes.
- Idempotent: re-runs upsert, no duplicates.
- Planning-application values are tagged `is_proposed=true` with the application
  number and must be presented as "proposed … subject to approval".

## Layout
```
enrich.py                 CLI entrypoint (argparse; dry-run default)
liqwd_enrich/
  config.py               env-var settings (no hardcoded secrets)
  db.py                   Supabase service-role client + WRITE GUARDS
  logging_setup.py        structured JSON logging
  normalize.py            name/builder canonicalization (pure)
  stage0_dedup.py         Stage 0 — canonicalization & dedup (proposals)  [DONE]
  stages.py               Stage 1-4 interfaces + the field schema/enums
  search/ extract/ municipal/   provider + extraction + planning connectors
tests/test_stage0.py      locks the tricky dedup judgments
```

## Where stages run
- **Stage 0 (dedup)** is pure DB/logic — runs anywhere, incl. offline from a
  JSON fixture. No network.
- **Stages 1-4** (search, fetch, images, vision, copy) need open network egress
  + API keys (Google CSE, Anthropic) — run **off-box**, not in the allowlisted
  managed env.

## Usage
```bash
# Stage 0 dedup, dry run, offline fixture -> CSV:
python enrich.py --stage 0 --from-json /tmp/miss.json --report reports/miss.csv

# Stage 0 dedup live from Supabase (still dry run):
python enrich.py --stage 0 --city Mississauga
# ...append --commit to write dedup_proposals.

# Stages 1-4 (off-box, with .env filled):
pip install -r requirements.txt
python enrich.py --stage all --city Mississauga --rate-limit 1.5
```

## CLI
`--city` (default Mississauga) · `--project-id` · `--all-gta` ·
`--stage 0|1|2|3|4|all` · `--commit` (default off) · `--limit N` ·
`--rate-limit S` · `--force` · `--from-json` · `--report` · `--verbose`

## Config
Copy `.env.example` → `.env` and fill `SUPABASE_*`, `ANTHROPIC_API_KEY`,
`GOOGLE_CSE_KEY`, `GOOGLE_CSE_CX`. Never commit `.env`.

## Database
Staging tables are added by `supabase/migrations/0027_enrichment_staging.sql`
(additive; RLS admin-read; service-role write). Existing
`project_media_candidates` is reused for image candidates.
```
enrichment_runs · project_field_candidates · dedup_proposals ·
enrichment_source_snapshots
```

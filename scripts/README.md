# WordPress → LIQWD importer

`import-wp.mjs` seeds `projects` + `public_project_pages` from the MyCondoPro
WordPress REST API for **one `location` term at a time** (default: Mississauga,
term `518`). It imports **facts only** and generates **fresh, original** copy —
it never republishes source prose, and it loads everything as **drafts**
(`record_status='draft'`, not public, not indexable).

## Prerequisites

- **Node 18+** (uses built-in `fetch`). No extra dependencies.
- **Network egress** to the hosts you use: `mycondopro.ca` (fetch/images),
  `api.anthropic.com` (extract/generate), `<project>.supabase.co` (load).
- A repo-root **`.env.local`** (auto-loaded). See keys below.

```bash
# .env.local
WP_BASE=https://mycondopro.ca
WP_LOCATION_ID=518            # Mississauga
WP_CITY_NAME=Mississauga
ANTHROPIC_API_KEY=sk-ant-...   # for extract + generate
ANTHROPIC_MODEL=claude-sonnet-4-6
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...  # server-only, bypasses RLS
SUPABASE_MEDIA_BUCKET=project-media
```

## Run it in order

```bash
npm run import:check       # egress preflight — confirm required hosts are allowlisted
npm run import:fetch       # pull Mississauga projects + media  -> scripts/out/raw.json
npm run import:build       # derive clean facts -> scripts/out/projects.json + review.csv
#  → open review.csv and sanity-check the facts before spending tokens

npm run import:extract     # Claude fills specs (builder, storeys, address, price…)
npm run import:generate    # Claude writes fresh headline/description/SEO

npm run import:images                       # download images -> scripts/out/images/<slug>/
node scripts/import-wp.mjs images --upload  # also push them to the Supabase bucket

node scripts/import-wp.mjs load             # DRY RUN (prints what it would write)
node scripts/import-wp.mjs load --commit    # actually upsert the drafts
```

## Notes

- **Idempotent:** `load` upserts on `slug`, so re-running updates rather than
  duplicates. `images` skips files already downloaded.
- **Facts vs. copy:** extracted facts go to `projects`; AI copy goes to
  `projects.description_ai_draft` + `public_project_pages` (`page_*`, `seo_*`).
  `_extract_confidence` / `_extract_notes` in `projects.json` flag low-confidence
  rows to review before publishing.
- **Images:** download is on by default; re-hosting in the bucket is opt-in
  (`--upload`). Make sure you hold the rights to any image you publish.
- **Verify before publishing:** source facts (esp. price/occupancy/storeys) are
  third-party and may be stale — confirm against the builder before flipping a
  page to `published`.

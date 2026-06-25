# Auto hero-image sourcing — recurring agent runbook

Backfills real renderings for projects whose hero was unpublished by the
2026-06-24 visual audit (floor plan / brochure). Runs as a scheduled Claude
agent (cron). The *fetching* happens off-box in the `liqwd-source-hero` Supabase
Edge Function (the sandbox/agent can `WebSearch` but cannot fetch arbitrary
pages/images); the agent does discovery + visual verification + publishing.

## The loop (each run, bounded to ~8 projects)

1. **Pick a batch.** Supabase project `mzdqlhopxfknwqxxuonn`:
   ```sql
   select id, project_name, city, builder_name
   from projects
   where record_status='draft'
     and import_notes ilike '%hero audit 2026-06-24: hero was a floor plan%'
     and import_notes not ilike '%auto-source%'   -- not yet attempted
   order by random() limit 8;
   ```
2. **Discover** (per project): `WebSearch` "<name> <city> <builder> condos|homes".
   Prefer rich listing/builder pages that carry a hero rendering as `og:image`
   (aggregators like gta-homes.com, condonow.com, tallproperty.com, builder
   sites). Collect 2–3 candidate page URLs.
   - **Harbour Marketing** (`harbourmarketing.ca`) is a first-class source —
     their VIP broker portals are frequently the only page that exists for a
     "coming soon" project with minimal details elsewhere, and the portal's
     `og:image` is usually the project rendering. Try these slug shapes (name
     concatenated, no separators): `harbourmarketing.ca/account/<nameconcat>`,
     `harbourmarketing.ca/<nameconcat>`, `harbourmarketing.ca/project-<dashed>`.
     Use it both to source the hero AND to back-fill project facts (builder,
     units, price, occupancy) when a project isn't yet in the DB.
3. **Fetch off-box**: for each candidate page URL, POST to the edge function
   (no auth — `verify_jwt=false`):
   ```bash
   curl -sS -X POST https://mzdqlhopxfknwqxxuonn.supabase.co/functions/v1/liqwd-source-hero \
     -H 'Content-Type: application/json' \
     -d '{"project_id":"<id>","page_url":"<candidate>"}'
   ```
   It extracts the page's `og:image`, rejects logo/floor-plan/tracking URLs,
   rehosts to `project-media/<id>/sourced.<ext>`, and returns `{ok:true,url}`.
   You can also pass `source_url` instead if you already have a direct image URL.
4. **Verify visually**: download the returned `url` (Supabase storage is
   reachable) and **Read** it. Accept only an exterior/interior/aerial
   **rendering or photo**. Reject floor plan / logo / map / brochure — try the
   next candidate page.
5. **Publish** the first good one:
   ```sql
   update projects set hero_image_url='<sourced url>',
     hero_image_alt='Exterior rendering of <name>',
     public_page_enabled=true, record_status='published',
     published_at=coalesce(published_at,now()), updated_at=now(),
     import_notes = import_notes || ' [auto-sourced hero <date>: og:image rendering, verified, republished.]'
   where id='<id>';
   update public_project_pages set is_active=true,
     published_at=coalesce(published_at,now()), updated_at=now() where project_id='<id>';
   ```
6. **Record misses** so they're skipped next run:
   ```sql
   update projects set import_notes = import_notes || ' [auto-source attempted <date>: no rendering found]'
   where id='<id>';
   ```

## Guardrails
- **Additive only** — never delete or unpublish; only ever ADD a verified hero + publish.
- **Bounded** — ≤8 projects/run.
- **Idempotent** — the `auto-source` tag means a project is attempted once;
  remove the tag to retry.
- The edge function never sets the live hero — the agent promotes only after a
  visual check, so a floor plan can never slip back in.

## Worklist
`docs/hero-image-audit-2026-06-24.md` lists every project still down.

## Reusable verification
Run the full re-audit anytime with the saved workflow:
`Workflow({name:"audit-hero-images"})` (or `.claude/workflows/audit-heroes.js`).

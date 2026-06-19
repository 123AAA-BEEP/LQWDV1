# LIQWD — project notes for Claude

LIQWD is a broker portal + public marketing site for new / pre-construction homes
(Ontario, Canada). Next.js (App Router, TS) on Vercel + Supabase (Postgres, Auth,
Storage, RLS).

## Source of truth
- Code: this repo (feature branch `claude/peaceful-carson-jwbehu`, merged to `main` via PRs).
- Data + schema: Supabase project `mzdqlhopxfknwqxxuonn` (accessed via the Supabase MCP tools).
- DB migrations live in `supabase/migrations/` and are **run manually in the Supabase SQL editor**
  (or applied via MCP). Data-import artifacts live in `supabase/imports/`.

## Branch hygiene (READ FIRST — always build on the latest)
Always work **on top of the latest `main`, never beside it.** Branches drift fast
(multiple agents merge PRs daily), so a branch from earlier today can be dozens of
commits behind.
- **Before any work**, sync: `git fetch origin main && git merge origin/main` (resolve
  conflicts, then build). A SessionStart hook (`.claude/hooks/sync-latest.sh`) does this
  automatically and warns loudly if it can't merge cleanly — resolve that before coding.
- **Never** create a second, parallel version of something already on `main` — extend it.
- Migration files are **sequentially numbered**: continue from the highest number in
  `supabase/migrations/`; never reuse one.
- The live schema can be ahead of the repo — `src/lib/database.types.ts` and
  `supabase/LIVE_SCHEMA.md` are the source of truth for table shapes.

## The core invariant: public / private / provenance
Three audiences, enforced by RLS + views:
- **Public** reads `public_projects_view` (definer view): only `record_status='published'`
  + `public_page_enabled` + active `public_project_pages`. Public-safe columns only.
- **Approved brokers** read `broker_projects_view` (definer view): broker-relevant columns,
  **excludes** provenance. Gated to approved realtors + admins.
- **Admin-only provenance** on `projects`: `external_source`, `external_source_url`,
  `import_notes` (holds Altus inventory #s), `builder_names_raw`, `description_ai_draft`.
  Base-table `SELECT` on `projects` is **admin-only** (migration 0004). Never expose provenance.
Commission/commercials: `project_private_commercials` (broker-read, admin-write).

## Auth / roles
- `profiles.role` ∈ realtor|admin; `profiles.verification_status` ∈ pending|approved|rejected|suspended.
- `requireUserProfile()` bootstraps the profile on first load (race-safe). `assertAdmin()` for admin actions.
- Realtors submit a RECO verification (`/dashboard/verify` → `verification_requests`); admins approve in
  the Verifications queue (which also lists signed-up-but-unsubmitted pending users).
- `is_public_profile_enabled` gates whether an approved realtor appears as a public agent card
  (`public_realtor_cards`).

## AI SEO
- `src/lib/seo.ts`: `generateSeoFields` (Claude **Opus 4.8**, forced tool use `emit_seo`, public-safe
  fields only) and `maybeGenerateSeoOnPublish` (fills only EMPTY seo fields, never overwrites, never
  throws/blocks publish).
- Auto-runs on publish (`publishProject` + `bulkPublish`, capped 8/run); also a manual "Generate with AI"
  button on the admin project editor.
- Prompt instructions are admin-editable + persisted in `seo_prompt_settings` (migration 0005, single row,
  admin RLS), edited at Admin → **Settings**, read on every generation.
- Requires `ANTHROPIC_API_KEY` in Vercel env. Uses `@anthropic-ai/sdk`.

## Admin console (`/dashboard/admin`)
Tabs: Overview, Verifications, Submissions, Update requests, Proposals, RFPs, Realtors,
Media (candidate images), Suggestions ("Got an idea?"), Projects, Rewards, Settings.
Overview shows live pending counts per queue.
- Projects tab: searchable + load-more; checkbox bulk actions (Approve/Draft/Archive, Publish/Unpublish).
- Project editor: canonical fields, broker-only Commission & negotiability, Public page content
  (assigned agent dropdown — lists ALL realtors, warns if not public; SEO fields + Generate button), uploads.
- "Suggest an update" (broker) supports image attachments (private `project-documents` bucket).

## Public site & routing (same domain, separate layouts via route groups)
- `(marketing)` → **realtor/agent** site at `/` (broker-portal pitch + brokerage trust strip).
  Header/footer: `SiteHeader`/`SiteFooter`, agent CTAs (Sign up / Log in).
- `(public)` → **consumer marketplace**: `/projects` (browse grid + search/filters, reads
  `public_projects_view`) and `/projects/[slug]` (detail + lead form). Own `PublicHeader`/
  `PublicFooter` (no broker-portal CTAs; "For agents →" cross-link). Shows only published projects.
- `/dashboard/*` → authenticated app (gated). No subdomains — separation is by path + layout.

## Conventions / gotchas
- Develop on `claude/peaceful-carson-jwbehu`; ship via PR → merge to `main` (Vercel auto-deploys).
- Run `npx tsc --noEmit` and `npm run lint` before committing.
- This sandbox CANNOT fetch arbitrary external URLs (network policy) — builder sites, aggregators, even
  Wikipedia 403. `WebSearch` works; direct page/image scraping does not. Image ripping must run elsewhere.
- Storage buckets (migration 0003): avatars, logos, project-media (admin write), project-documents
  (approved-realtor write, admin read). Direct browser upload pattern avoids Vercel's 4.5MB action limit.
- Data: ~1,145 projects (Altus + small livabl seed). Dedup key is the Altus inventory # (in import_notes).
  Same name+city can be legit separate phases — don't blind-dedup.

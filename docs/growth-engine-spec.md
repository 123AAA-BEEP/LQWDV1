# Growth engine v1 — Insights articles + first-party analytics

Shipped 2026-07. Adapted from an external "LIQWD Growth Engine" build prompt
that targeted a months-old snapshot of the repo — reconciled against reality:
already-built items were skipped (sitemap/robots, project JSON-LD, lead
routing, city hubs), migration numbers were continued from the live sequence,
and Phase 2 was deliberately parked (see the end).

## 1. Insights articles (SEO content engine)

**Flow:** Admin → Articles → search published projects → pick type + tick
projects → **Generate draft** → human edits/fact-checks in the editor →
`in_review` → **Publish** → live at `/insights/{slug}`.

- **Generator** (`src/lib/articles.ts`): Opus 4.8, forced tool `emit_article`.
  Grounding boundary: facts come ONLY from `public_projects_view` — provenance
  and broker commercials structurally cannot reach the prompt. House style is
  appended from the same admin-editable `seo_prompt_settings` the SEO
  generator uses. Types: project spotlight, neighbourhood guide, comparison,
  market update.
- **Why grounded:** the defence against Google's scaled-content-abuse policy
  is that every piece states true, checkable, listing-specific facts. Nothing
  auto-publishes; a human pass is mandatory (`generated_by_ai` is tracked).
- **Data** (migration 0078): `articles` (admin-only base table, RLS mirrors
  the projects invariant) + `public_articles_view` (published rows only,
  public-safe columns). Statuses: draft → in_review → published → archived;
  `indexable` controls robots meta + sitemap, not visibility.
- **Public pages:** `/insights` index + `/insights/[slug]` — Article JSON-LD,
  canonical, OG image from hero, related-listings strip (the funnel back to
  inventory), and a facts-freshness disclaimer. Markdown rendered by
  `src/lib/markdown.ts`: escape-ALL-input-first, then emit a fixed tag set —
  no markdown dependency, no raw-HTML path.
- Admin nav badge counts `in_review` articles.

## 2. First-party page analytics

**No tracking script, no cookies, no raw IP/UA.** (Migration 0079.)

- `src/lib/analytics.ts` → `recordPageEvent(eventType, pageType, target)`:
  server-side, writes via service role in `after()` (post-response), never
  throws, no-ops without `SUPABASE_SERVICE_ROLE_KEY`. `session_hash` =
  sha256(ip | ua | UTC-date | salt) → unlinkable across days. Captures
  external referrer host + UTM params.
- **Instrumented:** project page views (+ UTM from Promote links), project
  lead submits, agent-profile views, article views.
- **Read side:** `page_events` is admin-only; `page_stats_daily` is a
  security_invoker rollup view. Admin → Analytics shows 7/30-day views+leads
  per surface, top project pages, top articles, traffic sources.
- **Speed-to-lead:** `project_leads.first_responded_at` is stamped the first
  time a lead leaves `new` (realtor workspace + admin queue). Feeds future
  "avg response time" metrics.
- Complements `link_visits` (agent share-link attribution) and
  `broker_portal_events` (portal clicks) — different questions, kept separate.

## Operating notes

- Generation costs one Opus call (~$0.10–0.15). The admin picks ≤6 projects;
  facts are compact.
- ENV: needs `ANTHROPIC_API_KEY` (already set) — optional `ANALYTICS_SALT`
  (falls back to the service key as hash salt).
- Cadence suggestion: 2–3 reviewed articles/week beats 20 unreviewed ones.
  Publish only what a human has fact-checked against the linked listings.

## Parked (needs an explicit founder decision)

The original prompt's **Phase 2 — sponsored placement / paid lead routing**
(agents pay to be the assigned agent on content pages) and **Phase 3 — Stripe
billing for it** are NOT built. Selling lead priority while marketing "free
leads, no pay-to-play" is a positioning contradiction; if we ever do it, it
needs its own framing (e.g. "sponsor a neighbourhood guide" as advertising,
clearly labelled, never touching lead routing). Decision owner: Alex.

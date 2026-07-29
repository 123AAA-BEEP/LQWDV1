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

## 3. Daily automation (cron)

`/api/cron/daily-content` (vercel.json, 10:47 UTC daily ≈ 6:47am ET; Bearer
CRON_SECRET) → `src/lib/daily-content.ts`:

- **Project of the day**: picks the newest published project with a hero +
  public pricing that no spotlight has covered, and drafts a spotlight via
  the same grounded generator.
- **Market note**: drafts a 450–700-word `market_update` grounded in (a)
  aggregate stats computed from our own published inventory and (b) fresh
  Ontario news via the Anthropic web-search tool — every external fact must
  be cited; the body ends with a `## Sources` section (review it before
  publishing).
- A third daily piece works through the brokerage backlog (§5).
- **Auto-publish via the editor-in-chief gate (founder decision 2026-07-29):**
  every generated piece is finished by `src/lib/editor-in-chief.ts` — a
  second adversarial model pass that edits like a Google quality rater
  (E-E-A-T / helpful-content), may NEVER add facts, attaches a hero from our
  own image library (never web-ripped — copyright), and returns a verdict.
  `publish` → live immediately; anything else (incl. any API failure — the
  gate fails closed) → held `in_review` with `editor_notes` (migration 0082)
  shown in the admin editor. Brokerage pieces get web_search in the editor
  pass to spot-check claims against sources. Morning ops email digests
  published vs held. The cron still skips itself at ≥ 8 unreviewed held
  pieces.

## 4. Agent-facing evergreen (new-licensee funnel)

`agent_guide` type (migration 0080): hand-written pieces targeting newly
licensed Ontario agents — created via the admin "Write from scratch" form
(not the AI generator; they aren't project-grounded). Three seeded drafts
(in review): after-passing-the-exam next steps, a fact-first brokerage-
selection framework (deliberately NO rankings — RECO requires comparative
claims to be verifiable; we compare published facts, never crown winners),
and a first-clients playbook. LIQWD mentions are factual feature statements
only.

## 5. Brokerage content engine

`src/lib/brokerage-content.ts` (migration 0081): deep dives on the 20
biggest Ontario brokerage brands + 8 head-to-heads new agents cross-shop,
web-search-grounded. **Named-brand editorial is accurate-or-nothing**, so the
rules are enforced in the prompt AND in code:

- Figures are framed as research findings: official terms stated plainly
  with attribution; office-specific / third-party-reported figures allowed
  when clearly framed ("one GTA office advertised…", "as of <date>") — the
  server-appended disclaimer tells readers a figure may reflect ONE location
  at the time of writing and that confirming with the local brokerage in
  writing is critical (founder calibration 2026-07-29). Bare unattributed
  numbers stay banned; where nothing is published the piece says so (that's
  useful info). Only pieces whose search corroborates essentially nothing
  are skipped.
- No rankings/winners ("may fit you if…" framing), non-disparaging (no
  lawsuits/rumours/review-site content) — these brands employ our users.
- `## Sources` section validated in code; a verification + no-affiliation
  disclaimer is appended server-side; deterministic slugs prevent duplicates.
- Reaches the queue two ways: the daily cron works through the backlog one
  piece per day (third daily article), and Admin → Articles has an on-demand
  generator (pick one brand, or two to compare). Same review gate as
  everything else.

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

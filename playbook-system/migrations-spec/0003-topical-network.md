# Migrations-spec 0003 — Topical Network (C1's stateful graph)

**Status: PROPOSED — founder review required before any migration is written.**

## In plain English

This is the **master content map** — every topic we could ever write about
(neighbourhoods, projects, buyer questions, market themes), stored as
connected dots in the database instead of someone's spreadsheet. Each dot
knows three things: what it is, whether it's been written yet, and which
other topics it connects to.

Why it matters:

1. **The writing machine works FROM the map, never freestyles.** An article
   only gets drafted once its topic has keywords, a category, and a brief
   filled in. No more "the AI picked something random today."
2. **It never writes the same thing twice** — the map knows what's covered,
   so every new piece fills a real gap.
3. **It catches self-competition.** If two of our pages are fighting over the
   same Google search, the map records it so we fix it instead of
   rediscovering it every quarter.

The ~65 articles the daily engine already wrote get imported as "done" dots,
so the map starts truthful, not empty.

The Content blueprint's core structure: the topical map as a stateful graph in
Supabase, not a spreadsheet. C1 tends it; C2 drafts only metadata-complete
nodes; G7 and E2 read and feed it.

## 1. `topic_nodes`

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| property | text | which site owns it: "liqwd.ca" \| "resale" \| microsite domain |
| slug | text | unique per property; becomes the article/page slug |
| title | text | |
| kind | text | pillar \| cluster \| neighbourhood \| project \| buyer_question \| market_theme |
| parent_id | uuid → topic_nodes | hub-and-spoke is a subgraph shape, not a second system |
| keywords | text[] | max 3 (metadata gate) |
| category | text | |
| description | text | the brief / search-intent note |
| state | text | pending \| metadata_complete \| queued \| generating \| complete \| failed |
| authority_ceiling | numeric | new-site mode: max keyword difficulty this property can chase now |
| article_id | uuid → articles | set when C2's draft lands |
| relevance_rank | int | business relevance ordering for C1's fill-in batches |
| last_error | text | failed-state reason |
| created_at / updated_at | timestamptz | |

Metadata-before-generation gate = `state` may only move to `queued` when
keywords, category, slug, description are all non-empty (DB check constraint).

## 2. `topic_edges` — non-tree relations

(source_id, target_id, kind: supports | compares | cannibalization_risk) —
C4 link weaving and E2 cannibalization findings both live here, so "two pages
chasing one query" is a queryable fact, not a rediscovery.

## 3. Wiring to existing tables

`articles` gains `topic_node_id uuid` (nullable — existing daily-content
pieces predate the graph; C2 sets it going forward) and the content grader
adds `article_grades` (article_id, version, rubric_version, score, breakdown
jsonb, created_at) — grader itself is a foundation ticket (versioned rubric),
this is just where its numbers land so C2/C3's grade-revise loops and decay
routing have durable history.

## 4. Notes

- The existing daily-content pipeline keeps running unchanged; C1/C2 arrive as
  the *governed* successor and the cadence gate already shipped (1 post/2
  days) applies to whichever engine drafts.
- Seed strategy for review: import the ~65 existing AI articles as `complete`
  nodes (dedupe by slug), then C1's first run proposes the gap map for
  Mississauga-first neighbourhoods + pre-con buyer questions.

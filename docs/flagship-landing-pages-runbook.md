# Flagship Landing Pages — First-Mover Runbook

**Status:** Teed up, parked. Not triggered per-project yet. The machinery gets
built idle so a live drop is fast; detection of *which* project to trigger on
is an upstream dependency (see §6), deferred by decision.

**Thesis (proven, not theoretical):** Buy the exact-match domain for a brand-new
project by a major developer **before Google has indexed the name**, drop a
substantial standalone landing page, and own the SERP + the lead flow for that
project name. Real-world proof: operator's own domains — *Dairyland Towns*, *The
Valley (Woodbridge)* — produce substantial lead volume. The edge is **being
early**; everything here optimizes for speed-to-live once a target is picked.

**Why this is NOT a doorway network (the distinction that matters):** one
substantial, genuinely-useful page per *hot* project, used sparingly (flagships,
not all ~1,150), each with real content/images/value. That's a first-mover
microsite, not a thin funnel farm — the pattern Google penalizes is mass
templated thin domains interlinked to funnel a destination. Keep it sparing and
substantial and the distinction holds.

---

## 1. Trigger criteria (when to drop a page)

Fire only when a candidate clears ALL of:
1. **Brand new** — pre-launch or just-launched; **not yet indexed, or barely
   indexed**, for its project name (that's the whole window).
2. **Major/credible developer** — real project, real inventory, will attract
   organic demand.
3. **Desirable for the market right now** — the demand read drives selection.
   **GTA today = low-rise: townhomes and freehold.** (Re-assess the segment per
   market/cycle; this is a moving target, not a constant.)
4. **Available or owned exact-match domain** — `{projectname}.com` /
   `{projectname}homes.ca` etc. available to register (or already owned). If the
   good name is taken and aftermarket is expensive, usually skip.

## 2. What "teed up" means (the idle machine)

Build once, then each drop is: **buy domain → map it → go.** The idle machine:

- A **standalone single-project microsite template** (its own layout, no LIQWD
  marketplace chrome) that renders a full page from one project record: hero,
  key facts, gallery, floor plans, incentives, FAQ, a lead form, and schema.
- A **domain → project mapping** so pointing a new domain at the app renders
  that project's microsite instantly (proxy/middleware resolves host → project).
- A **per-domain Search Console verification** route (serves the
  `google-site-verification` token/file for each domain) + a per-domain sitemap.
- The **lead form routes into the existing LIQWD lead pipeline** with
  attribution (`source = the microsite domain`), so every lead lands in our
  system and can route to the assigned agent — the operator, or a LIQWD agent.

## 3. Reuse map (most of this already exists)

| Piece | Status |
|---|---|
| SEO copy generation | **Built** — `src/lib/seo.ts` generator |
| Hero / image sourcing | **Built** — hero-sourcing pipeline + backfill |
| Lead capture + routing + email alerts | **Built** — `submitLead` + attribution |
| Schema / JSON-LD | **Built** — project page patterns |
| IndexNow instant-submit | **Built** — `/api/reindex` |
| Project data model | **Built** — `projects` + `public_projects_view` |
| **Standalone microsite layout (no marketplace chrome)** | **Net-new** |
| **Multi-domain serving (host → project resolver in proxy)** | **Net-new** |
| **Per-domain GSC verification file route** | **Net-new** |
| **Lead attribution `source = domain`** | **Small extension** |

So the build is mostly *assembling existing pieces* behind a standalone layout +
a host-based router. The genuinely new architecture is **serving many domains
off one app, each resolving to a project.**

## 4. Architecture (net-new piece)

- Add a lightweight `landing_domains` mapping (domain → project_id, gsc_token,
  active, created_at) OR a config map if the count stays tiny.
- In the proxy/middleware: if the request host is a mapped landing domain (not
  liqwd.ca), rewrite to the microsite renderer for that project_id.
- Microsite route renders the full single-project page from the project record;
  its own OG/meta, canonical = the landing domain (self-canonical — this page is
  the destination, **not** cross-canonicalled to liqwd.ca; we want it to rank on
  its own).
- Vercel: add each purchased domain to the project (watch custom-domain limits;
  fine for a handful of flagships, revisit if it ever scales to hundreds).

## 5. Per-drop checklist (execution, once triggered)

1. **[You]** Register the exact-match domain, add DNS per Vercel, hand me the
   domain.
2. **[Me]** Ensure the project exists in `projects` (create/enrich if brand-new
   — this is a fresh project, so likely a new record with real details).
3. **[Me]** Map domain → project; generate/curate content + source hero &
   gallery & floor plans; set the microsite live.
4. **[Me]** Drop the per-domain GSC verification file + sitemap; IndexNow ping.
5. **[You]** One click "verify" in Search Console (your Google login).
6. **[Me]** Confirm lead form routes into LIQWD with `source = domain` and the
   right agent assignment.
7. Cross-link: the microsite references the LIQWD listing / assigned agent; both
   feed the same lead system.

## 6. Upstream dependency (deferred, discussed later)

The trigger's fuel is **early detection** — knowing a desirable new project
exists *before* it's widely indexed. Options to define later:
- Extend the **discovery engine** to early-scan a select set of major-builder
  pages / broker portals / registries on a tight cadence, flagging brand-new
  low-rise launches.
- Manual operator tips (you already spot these) feeding a "trigger this" queue.
Detection quality is what makes or breaks the edge; parked by decision for now.

## 7. Guardrails

- **Sparing** — flagships only, never all projects (doorway risk + cost + it
  underperforms the free directory pages).
- **Substantial** — real content, images, value on every microsite.
- **Self-canonical** — don't cross-canonical to liqwd.ca; let the microsite rank
  independently and (ideally) take a second SERP slot alongside the directory.
- **Every lead is LIQWD's** — routed into our pipeline with attribution.
- **Cost:** ~$12–20/yr domain per page (if available); content/build/hosting
  ~$0 marginal on our stack for a handful. Directory pages stay the free,
  compounding default for everything else.

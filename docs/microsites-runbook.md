# Microsites — runbook

One standalone, single-project landing site per domain (e.g.
`echotownswaterdown.com` → Echo Stacked Towns). Same repo, same Supabase, same
Vercel project as liqwd.ca — the proxy routes by `Host` header, so a new
microsite is **zero new infrastructure**: a DB row plus a domain attached to
the existing Vercel project.

Companion docs: `docs/microsite-context-questionnaire.md` (the staple context
questions), `docs/scoping-ingestion-microsites-florida.md` (strategy scoping —
why this is not a PBN, cannibalization guards, post-sellout pivot).

## How it works (architecture)

- `microsite_configs` (migration 0089): `domain` (unique, bare, lowercase),
  `project_id`, `status` (`draft` | `live` | `retired`), `context` (jsonb —
  questionnaire answers), `content` (jsonb — the generated page), and
  `capture_key` (uuid the lead form must echo back). Admin-only RLS.
- `src/proxy.ts`: any request whose host is not a primary host
  (liqwd.ca / www / *.vercel.app / localhost) is rewritten to
  `/sites/{host}`. Primary-host requests to `/sites/*` redirect home.
- `src/app/sites/[domain]/page.tsx` renders the page. **SEO contract:** only
  a `live` config with generated content renders and indexes. Anything else —
  unknown domain, `draft`, `retired`, no content — gets a minimal
  **noindex "Coming soon" holding page**, so a freshly-attached domain never
  serves a duplicate of liqwd.ca.
- Content generation (`src/lib/microsites.ts` → `generateMicrositeContent`):
  facts come ONLY from the project's `public_projects_view` row (never
  provenance); the `context` questionnaire steers emphasis and ordering; the
  prompt requires copy that differs from the marketplace listing and forbids
  presenting the page as the builder's official site.
- Leads (`src/app/sites/[domain]/actions.ts`): same quality bar as the main
  form — honeypot, required phone (≥7 digits), required agent/consumer radio,
  server-side re-validation, `capture_key` + `status='live'` check. Inserted
  into `project_leads` with `source = <domain>`, so they appear in the normal
  admin Leads queue and agent claim flow, attributable per microsite.
- Analytics: each render records a `page_view` against the project's public
  page with `utm.source = <domain>`, `utm.medium = "microsite"`.
- Disclosure footer on every live page: independent page operated by LIQWD,
  not the builder's official website, plus one link to the liqwd.ca listing.

## Launch checklist (per microsite, ~10 minutes + DNS)

1. **Buy the domain** (Vercel Domains, Cloudflare, Porkbun — anywhere).
   Prefer the project's branded name: `{project}{city}.com` / `.ca`.
2. **Create the config** — Admin → Microsites → search the published project →
   enter the bare domain → Create. (Project must be published with a public
   page; the generator reads only public data.)
3. **Add context** (optional but high-leverage) — paste answers to any of the
   staple questions from `docs/microsite-context-questionnaire.md` (buyer
   profile, hook, lead-with / avoid, local nuggets, deposit structure). Free
   text or JSON both work.
4. **Generate** — one click; review every fact in the preview. Regenerate
   after editing context whenever you want a different angle.
5. **Set live** — blocked until content exists. From this moment the domain
   serves the real page (once attached) and is indexable.
6. **Attach the domain to the Vercel project** — Vercel dashboard → the
   LIQWD project → Settings → Domains → Add → enter the domain. If the domain
   was bought on Vercel, pick **"Connect an existing project"** on the
   post-purchase screen and choose the LIQWD project — DNS is handled
   automatically. External registrars: point A → `76.76.21.21` or CNAME →
   `cname.vercel-dns.com` per Vercel's instructions.
7. **Verify** — hit `https://{domain}` (expect the live page, or the noindex
   holding page if you attached before setting live — both are safe), submit
   a test lead, confirm it lands in Admin → Leads tagged with the domain.
8. **Index** — request indexing for `https://{domain}/` in Google Search
   Console (add the domain as a new GSC property — Domain type, verified via
   the registrar's TXT record).

Order doesn't strictly matter for 5 vs 6: attaching the domain while the
config is still `draft` just serves the noindex holding page until you flip
it live.

## What's manual vs automated

| Step | Status |
| --- | --- |
| Buy domain | Manual (~2 min) — registrars require a human + payment |
| Create config, context, generate, review, go live | Admin UI, minutes |
| Routing, rendering, SEO tags, JSON-LD, lead capture, source attribution, analytics | Fully automatic |
| Attach domain to Vercel | Manual (~1 min) — or v2: Vercel API (`POST /v10/projects/{id}/domains` with a `VERCEL_TOKEN`) to auto-attach on "Set live" |
| GSC property + index request | Manual (~3 min per domain) |

## Known tradeoffs (v1)

- **robots.txt / sitemap.xml**: the proxy matcher excludes these paths, so a
  microsite domain serves liqwd.ca's robots.txt. Harmless in practice (it
  disallows only dashboard/api paths and points at liqwd.ca's sitemap, which
  Google treats as a cross-host reference to ignore) — but per-domain
  robots + one-URL sitemap is a small v1.1 win alongside multi-page.
- **Single page**: v1 is one URL with `#register` anchor. Organic sitelinks
  need real multi-page depth — `/floor-plans`, `/pricing`, `/neighbourhood`
  are the v1.1 fast-follow (also gives Google Ads sitelink assets real
  targets).
- **Skin**: `skin` column exists (`classic` only for now) so alternate visual
  treatments can ship without schema changes.

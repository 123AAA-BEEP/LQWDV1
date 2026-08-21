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
   text or JSON both work. **Standing practice: ALWAYS include the builder's
   website or sales-page link (or paste their about copy).** Any URL in the
   context is fetched at generation time and fed to every writing call as
   source material, so the developer profile and overview weave real
   researched substance in our voice instead of running thin.
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

## The standard page format (v2)

Modeled on the proven VIP-registration landing format (thevalleyinwoodbridge.com
style). Top to bottom: hero (rendering + name + hook + price/beds/type pills +
CTA) → **lead form at the top** → sticky "on this page" anchor nav → intro →
photo strip → deep sections → renderings gallery → FAQ → **lead form at the
bottom** → disclosure footer. Photography comes from the project's public
`project_media` (floor plans excluded); JSON-LD carries ApartmentComplex +
AggregateOffer + FAQPage.

### Page format rules (v4)

- **The hero IS the lead form** (The Valley pattern): full-bleed rendering,
  a "{City}, {Province}" chip, the project NAME as the only headline, then
  the register card ("Register Now" / "Get available floor plans, pricing
  and details.", compact form with no message field) — all above the fold.
  A second form closes the page. Buttons and accents wear the extracted
  brand colour.
- **Map**: a Google Maps embed with the address pin sits near the bottom
  (`#map`), using the project's full address when we have it.
- **Navigation lives in the footer** ("Useful links": sub-pages, section
  anchors, FAQ, Location, Register Now) — the hero stays clean.
- **Non-linear layout**: sections alternate text/image columns
  (left-right-left, The Valley pattern); a section without an image falls
  back to centred full-width text.
- **Stock image library** (Admin → Microsites → Stock image library):
  themed fallback photography — hero / neighbourhood / transit / amenities /
  parks / homes / lifestyle / generic — for projects with thin media. Real
  renderings ALWAYS win; stock fills the remaining slots, picked
  deterministically per domain (stable per site, varied across the network),
  city-tagged images beat generic for matching projects, honest alt text
  (never labelled as the project's rendering). Upload directly or paste
  Unsplash/Pexels URLs; only use images licensed for commercial use.
- **Hero style**: `{"hero_style": "colour"}` in the context swaps the hero
  photo for a branded gradient — for projects whose hero is a placeholder
  graphic that looks bad blown up.
- **Brand override**: the extracted palette/font is editable in the content
  editor (button colour, accent, font, Reset to defaults).
- **Canonical section order — educate first, sell second**: About the
  project → Neighbourhood → Getting around → Nearby amenities → About the
  developer, then the commercial block (pricing story, homes, top reasons,
  deposit/incentives, investor angle, buying process, why register).
  Generation always emits in this order; the admin editor has ↑/↓ controls
  to hand-reorder afterwards.
- **Photography everywhere**: 3-image strip after the intro, a full-width
  image band after every second section, all pulled from the project's
  public media (which is fed by the ingestion machine).
- **Branding is borrowed from the project's own renderings**: at generation
  time a vision pass reads the hero rendering and extracts a primary button
  colour, an accent, and the closest Google font (from a safe allowlist).
  The page then wears the builder's palette/typography, not LIQWD's.
  Stored in `content.brand`; defaults apply when no rendering exists.
- **True preview**: Admin → microsite → "Open full preview" renders the
  EXACT public component at any status (`/microsite-preview/{id}`,
  admin-only, noindex). What you preview is what ships.

### Copy standards (enforced in code, not just prompt)

- Writing model: **claude-opus-5** (the microsite is the storefront).
- Every section is generated by its OWN prompt from a fixed library of 12
  (About, Pricing story, Homes & floor plans, Top 5 reasons, Neighbourhood,
  Getting around, Nearby amenities, Deposit & incentives, Investor angle,
  About the builder, How pre-con buying works, Why register now). Sections
  are picked automatically from the project facts + context, and overridable
  per site via checkboxes on the admin screen.
- Voice: grade 6 to 8, short sentences, plain words, talks to "you",
  contractions fine, no hype-word list (stunning/nestled/boasts/etc.), no
  exclamation marks.
- **Em/en dashes are banned.** The prompt forbids them AND `stripDashes()`
  scrubs any that slip through: titles get " | ", body copy gets ", ",
  numeric ranges become "X to Y". SEO title template is
  "{Project} in {City} | Pricing, Floor Plans & Launch Details".
- **Markdown bold/italics are banned in copy** (machine-writing tell): the
  prompt forbids `**`/`_` and the scrubber strips any that slip through.
- Project facts only from the public fact block; general city/region
  knowledge (real highways, transit, landmarks) is allowed; unpublished
  details are stated as "not released yet", never guessed.

## Editing the generated page

Everything the generator produces is editable in Admin → Microsites → (site) →
**Page content**: SEO title + meta description overrides, H1, subhead, CTA
label, intro markdown, sections (add/remove/reorder by editing), FAQ.
Regenerating replaces the body copy but **keeps the SEO overrides**; hand
edits are stamped (`edited_at`) in the preview footer.

## Email-triggered ingestion ("the deals inbox flow")

The email→project intake (`/api/inbound-email`, SendGrid Inbound Parse — the
same inbox you already forward hot-drops to) now understands a microsite
directive. Forward the developer's email and add either:

- **`microsite: somedomain.com`** — in the subject line (preferred) or body.
  After the project ingests, the config is created, content is generated
  immediately when the project auto-published, and ops gets a "review the
  microsite" email linking straight to the admin screen. If the domain sat in
  the **subject** line and auto-buy is enabled (below), the domain is bought
  and attached too — the whole chain from one forwarded email.
- **`microsite`** (bare word, no domain) — ops gets a ping with suggested
  domain candidates derived from the project name/city; create the config
  from the admin after buying one.

Going **live is always a human click** — the machine stops at a reviewable
draft.

## Vercel domain automation (opt-in via env)

Set in Vercel env:

- `VERCEL_TOKEN` — account/team API token (Vercel → Settings → Tokens)
- `VERCEL_PROJECT_ID` — the LIQWD project id (Project → Settings → General)
- `VERCEL_TEAM_ID` — only if the project lives under a team
- `MICROSITE_AUTO_BUY_MAX_USD` — optional; enables **unattended** purchase
  from the email directive, capped at this first-year price. Unset = every
  purchase needs an admin click.

What it unlocks:

- **Domain card** on the microsite screen: shows attach state; if the domain
  is unregistered, shows the live price with a one-click **Buy & attach**
  (billed to the Vercel account's payment method, auto-renew on,
  `expectedPrice` passed so a price change fails instead of overspending).
- **Auto-attach on "Set live"** — flipping a site live attaches the domain to
  the Vercel project automatically.
- **Email auto-buy** — with the cap set, `microsite: x.com` in a forwarded
  email's SUBJECT line buys + attaches unattended. Three explicit gates
  (subject-line domain, env configured, price ≤ cap) so a stray "microsite"
  in marketing copy can never spend money.

## What's manual vs automated

| Step | Status |
| --- | --- |
| Buy domain | One admin click when Vercel env is set (or unattended via email subject + auto-buy cap); otherwise manual at any registrar |
| Create config, context, generate, review, go live | Admin UI, minutes — or config+content auto-created from a forwarded email with `microsite: domain.com` |
| Edit any generated copy / SEO fields | Admin UI (Page content editor) |
| Routing, rendering, SEO tags, JSON-LD, lead capture, source attribution, analytics | Fully automatic |
| Attach domain to Vercel | Automatic on Set live / Buy (when env set); manual otherwise |
| GSC property + index request | Manual (~3 min per domain) |

## SEO evidence (founder's real GSC data)

Search Console data from the founder's past project microsite
(thevalleyinwoodbridge.com, 2,300+ clicks on the head term at position 1.8)
is the calibration source for this rail. What it proved:

- **Every top query is branded**: "{project} {city}" and close variants.
  There is no generic-keyword play at this stage; the brand IS the keyword.
- **The modifiers that rank and click**: "homes", "site plan", "prices"
  (in that order). "Site plan" beat "prices" on both clicks and position —
  hence the dedicated /site-plan sub-page (gate-kept like floor plans).
- **Inverted word order gets searched too** ("woodbridge valley" sat at
  position 14.5 = a coverage gap) — the neighbourhood page brief works the
  "{City}'s {Project}" phrasing in naturally.
- Title template accordingly: "{Project} in {City} | Homes, Prices &
  Floor Plans".

## Multi-page depth, crawler files, IndexNow (v3)

- **Sub-pages** ship with every generation: `/floor-plans`, `/pricing`,
  `/neighbourhood`, each with its own prompt, H1, SEO title, meta
  description, page-specific FAQ + BreadcrumbList schema, a lead form, and
  cross-links. This is the real path to organic sitelinks and gives Google
  Ads sitelink assets real targets. **Floor plans are gate-kept**: that page
  never shows layouts, square footage, or per-plan pricing. It is a text
  preview whose one job is registration; plans go to registrants.
- **Per-domain robots.txt** — live sites: `Allow: /` + their own sitemap;
  draft/retired/unknown domains: `Disallow: /` (the crawler-level twin of
  the noindex holding page). liqwd.ca's own robots/sitemap still bypass all
  session middleware (Jul 17-18 outage guard preserved via an early return).
- **Per-domain sitemap.xml** — home + whichever sub-pages exist, lastmod
  from the content timestamps.
- **IndexNow auto-ping** on "Set live" and on regenerating a live site
  (Bing/Yandex + the indexes behind AI search). The shared key file is
  served on every microsite domain at `/{key}.txt`. Google doesn't consume
  IndexNow: add the domain as a GSC property and submit the sitemap once.
- **Skin**: `skin` column exists (`classic` only for now) so alternate visual
  treatments can ship without schema changes.

Configs generated before v3 have no sub-pages (links and sitemap entries
simply don't appear; sub-page URLs redirect home) — hit Regenerate to create
them.

> Env note (2026-08-21): `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` are configured
> on the Vercel project — domain automation (price check, Buy & attach,
> auto-attach on Set live) is active from this deploy forward.

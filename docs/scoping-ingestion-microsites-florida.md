# Scoping session 2026-08-02 — three concepts (PARKED, not scheduled)

Founder-requested scoping; no builds authorized. Three concepts, each with
what exists, build shape, effort, and foot-guns.

---

## 1. Social / email / ads ingestion for project discovery

**Reframe: this extends the live discovery machine, it is not a new system.**
Existing rails: `discovery_signals` (3k+ rows) + daily sweeps (UrbanToronto/
Skyrise, news feeds incl. The Next Miami + Florida YIMBY, permits for
Toronto/Vancouver/Miami-Dade/Nashville/LA/Calgary/Edmonton, builder
directories) + ignite pipeline (corroborate → draft project). Email-intake
webhook already does: forwarded email → AI extraction → web research →
draft + ops ping (`email_intake_log`).

### Instagram — use Business Discovery, never scrape
- Scraping IG = ToS violation + ban risk. The legit path: **Instagram Graph
  API `business_discovery`** — with a LIQWD IG Business account + approved
  Meta app, read other Business/Creator accounts' public posts by username.
  Developers/sales agencies/architects are almost all Business accounts.
- Build: `social_watch` table (curated usernames, manually maintained by
  design) → poller cron (rate limits ~200/hr are ample) → captions through
  the EXISTING extract/research agents → `discovery_signals`.
- **Blocker: Meta app + business verification — the SAME founder-side
  blocker as Promote Phase 1. One verification unlocks both.**
- V1 without Meta: share any IG post to the intake email from a phone; the
  existing pipeline handles it.

### Email — near-free upgrade
Dedicated intake aliases subscribed to every builder/agency newsletter
(per-source tags, sender allowlist) → mail flows straight into the webhook,
zero forwarding. ~1 day.

### Meta ads — be honest about the API
Ad Library **API** covers political/issue ads only in NA; housing ads are
UI-only. V1 = 15-min weekly ops sweep of the Ad Library UI (searches:
"coming soon", agency names) → intake email. V2 = evaluate paid ad-intel
APIs. Do not promise automation Meta doesn't expose.

**Effort:** aliases ~1 day · IG poller ~3–4 days post-Meta-app · ads = ops
checklist. **Priority argument:** first-to-list compounds everything
(SEO first-mover, microsites, launch relationships).

---

## 2. Single-project lead-gen microsites

Founder concept + external advice reviewed. Endorsed from that advice:
PBN/footer-backlink half is the dangerous half — kill it (sitewide footer
links from thin same-destination sites = classic doorway/PBN fingerprint;
penalty risk flows to liqwd.ca); standalone-lead-machine half is real
(fresh EMD with deep single-project content genuinely outranks low-DA
marketplace pages — the same dynamic competitors use against us); domain
economics: Cloudflare Registrar at-cost (~$10.5 .com) / Porkbun ~$11 flat /
avoid GoDaddy renewals (~$23) and spam-associated alt-TLDs. ADD: **.ca**
(~$10–13) for Ontario projects — better local CTR + name availability.

### Two foot-guns the external advice missed
1. **Self-cannibalization**: microsites must carry UNIQUELY generated
   content (different prompts/angles from the same grounded engine), never
   copies of liqwd.ca pages — else Google duplicate-filters and may pick
   the microsite over the durable asset.
2. **Impersonation**: competitor microsites masquerade as builders'
   official sites. We must not — visible "independent information site by
   LIQWD; not the builder's official site" disclosure. Passing-off risk +
   builder relationships (Launch Services) both point the same way.

### Our structural edge
Generated from the live DB: one template repo (2–3 skins to avoid network
fingerprinting), config per site (domain + project_id), content from public
views, **nightly redeploys — competitor microsites go stale, ours can't.**
Leads POST to a keyed public capture endpoint → `project_leads` (source
tagged) → existing routing/CRM/agent machinery.

### Lifecycle
Selection gate: pre-launch timing (win the EMD first), real project-name
search demand, data depth (heroes/floorplans/pricing). Cap portfolio
~10–20. **After sellout: pivot the site to "resale & assignments at X"** —
feeds the assignment funnel on an aged domain; 301 to liqwd.ca only when
truly dead.

**Effort:** template + capture API + deploy pipeline ≈ 1–2 weeks once;
~1 hour + ~$11/yr marginal per site.

---

## 3. Florida lead generation — COMING-SOON condo & housing projects
(founder clarified 2026-08-02: target = coming-soon / pre-construction
condo and housing projects, not student housing)

### Why "coming soon" is the right wedge for a zero-DA entrant
Listing portals (Zillow/Realtor.com/Redfin) dominate for-sale SERPs
because they answer them with inventory — but **coming-soon projects have
no listings yet**, so those SERPs are portal-free by definition. The
competition is precon aggregators (CondoBlackBook-class) and project
microsites — the same class of opponent we already beat on freshness in
Ontario. Pre-launch project-name queries ("{project} Miami price list",
"{project} floor plans") start at zero competition for whoever publishes
first. **This is the Ontario first-to-list playbook transplanted, and the
discovery half is already running** (The Next Miami + Florida YIMBY feeds,
Miami-Dade permit sweeps; FL project seeds exist in the DB).

### Build shape (reuse-heavy)
1. **Inventory**: turn up ignite for FL signals — publish coming-soon FL
   projects with the standard page treatment (existing machinery; FL cities
   already flow into city hubs/sitemap once published).
2. **Content**: FL city hubs + "new condo launches {city} {year}" +
   project spotlights via the existing engine (US-market facts already
   supported by the research pass).
3. **Funnels**: project lead capture works as-is; consent line needs a
   **TCPA-grade variant** for US traffic (express written consent wording,
   stricter than CASL) — small form + copy change keyed off province/state.
4. **Microsites (concept #2 synergy)**: flagship Miami launches are the
   highest-value microsite candidates — coming-soon + EMD + first-mover is
   exactly the selection gate.
5. **Monetization**: flat per-lead fees to FL brokers/teams (FS 475:
   success-contingent referral fees = licensed activity; flat lead fees are
   the clean lane). Email = CAN-SPAM (`lib/email-compliance` supports it).

### Pilot
Miami-first (discovery densest there): ~30 coming-soon projects published,
2–3 city hubs, 5 spotlights, TCPA consent variant, one flagship microsite.
Measure 90 days: indexed pages, project-name rankings, leads, cost ≈
content-cron time + 1 microsite domain.

---

## Sequencing recommendation (when trigger is pulled)
1. Ingestion email-aliases v1 (near-free, immediate) — feeds both markets.
2. Microsites (compounds first-to-list advantage). IG poller lands when the
   founder completes Meta business verification (also unblocks Promote
   Phase 1).
3. Florida coming-soon pilot (Miami-first) — natural third because it
   REUSES 1 and 2: ingestion finds the launches, microsites capture the
   flagship ones, the platform publishes the rest.

The three concepts compose into one machine: discover first (ingestion) →
publish first (platform + microsites) → capture first (funnels). Cross-
cutting caution stands: the Ontario flywheel is days old — stagger the
starts, don't run all three from a standing start.

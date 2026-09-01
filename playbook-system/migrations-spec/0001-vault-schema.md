# Migrations-spec 0001 — The LIQWD Vault (Realtor / Market / Compliance)

**Status: PROPOSED — founder review required before any migration is written.**
Per the working rules, this is a reviewed spec, not a migration. Numbers here
continue LQWDV1's `supabase/migrations/` sequence when approved (next free: 0099).

The blueprint's judgment holds up against the live schema: the Vault is
**mostly formalization of tables LQWDV1 already has**. What's genuinely new is
(a) field-level *verified* discipline on realtor identity, (b) the Agent Brand
asset store, and (c) the Compliance Vault as data instead of prompt fragments.

---

## 1. Realtor Vault

**Existing foundation (no changes needed):** `profiles` (role,
verification_status, referral_code, is_public_profile_enabled),
`verification_requests` (RECO cert extraction via reco.ts already yields
structured fields), `public_realtor_cards`.

**New table `realtor_vault`** — one row per realtor profile, the *citable*
identity layer. Playbooks may only cite fields whose `*_verified_at` is set.

| column | type | notes |
|---|---|---|
| profile_id | uuid PK → profiles | |
| name_as_registered | text | RECO registration name |
| trade_name | text | usually identical to the full name; when set, this is the advertised name (founder spec 2026-08-29) |
| title | text | registered title: Salesperson \| Broker \| Broker of Record — required on advertising |
| name_verified_at | timestamptz | set when matched against the approved verification_request |
| reco_number | text | |
| reco_verified_at | timestamptz | |
| brokerage_name | text | as registered — required on advertising |
| brokerage_address | text | nullable; REQUIRED where the jurisdiction mandates it (rulebook RECO-AD-2 carries the per-jurisdiction flag) |
| brokerage_verified_at | timestamptz | |
| phone | text | required in the advertising identification block |
| email | text | agent email — required in the advertising identification block |
| service_neighbourhoods | text[] | slugs into the neighbourhood objects |
| review_sources | jsonb | [{platform, url, verified: bool}] — cite verified only |
| voice | jsonb | {tagline, bio_short, bio_long, signoff, tone} |
| updated_at | timestamptz | |

The advertising **identification block** (founder spec, RECO compliance):
trade name + title + phone + brokerage name (+ brokerage address where the
jurisdiction requires it) + agent email. This is the fixed E-E-A-T block the
page builders position-lock, and RECO-AD-2's lint checks for its presence and
completeness on every advertising surface.

RLS: owner read/write on unverified fields; `*_verified_at` columns admin-only
writes (verification approval sets them). All playbook reads go through the
service role with the verified filter applied in the tool contract.

**New table `agent_brand_assets`** — the Agent Brand upload store.

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| profile_id | uuid → profiles | |
| kind | text | logo \| logo_variant \| headshot \| team_photo \| brokerage_logo \| library_image |
| storage_path | text | bucket `agent-brand` (new; owner-write, public-read derived only) |
| derived | jsonb | {bg_removed, crops: {hero, email, square, story, ad_*}, alt_text} |
| rights_attested_at | timestamptz | REQUIRED non-null before any playbook may use a library_image (photo-rights rule PB-PHOTO-1) |
| version | int | asset swaps version, never overwrite |
| superseded_by | uuid | |
| created_at | timestamptz | |

**Brand colours + flavour choice** live on `realtor_vault.voice`? No — separate
column set on `realtor_vault`: `brand_colors jsonb` ({primary, secondary,
accent}), `flavour text` (house-template key), `brand_mode text`
(match | brand_first). Mirrors microsites' `brand_override` conventions
(hex-validated on write, WCAG contrast checked at render).

**Completeness meter** is computed, not stored: a view
`realtor_vault_completeness` (percent + missing-field list) that playbook
precondition nodes and the onboarding UI both read.

## 2. Market Vault

**Existing foundation — already IS the Market Vault:** `projects` (canonical,
approval-gated), `public_projects_view` (public-safe), `project_media`,
`neighbourhood` data on public pages, microsite content, `seo_hub_content`.

**Gap:** playbook-citable *market datasets* with source fields. New table
`market_datasets`:

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| scope | text | city \| neighbourhood \| project |
| scope_key | text | e.g. "mississauga/port-credit" |
| metric | text | e.g. avg_price_per_sqft, months_inventory, new_launch_count |
| value | numeric | |
| period | daterange | |
| source | text | REQUIRED — "TRREB Market Watch 2026-08", "StatsCan 98-…", "LIQWD inventory" |
| source_url | text | |
| created_at | timestamptz | |

Rule: any number a playbook publishes must join to a `market_datasets` row (or
a `projects` field) — this is the enforcement surface for "every stat carries
a source". Admin-write, service-role read.

## 3. Compliance Vault

**New table `compliance_rules`** — the versioned, lintable rulebook
(`playbook-system/compliance/rulebook-v1.md` is the human-readable twin;
rows and doc stay in sync, doc is source of truth for meaning).

| column | type | notes |
|---|---|---|
| id | text PK | rule ID, e.g. RECO-AD-1 (stable forever) |
| rulebook_version | text | "1.0" |
| category | text | reco_advertising \| trreb_data \| casl \| privacy \| photo_rights \| claims |
| severity | text | block \| warn |
| check_kind | text | regex \| presence \| llm_judgment \| structural |
| check_spec | jsonb | machine-readable check parameters |
| human_text | text | the plain-language rule, shown on violations |
| active | bool | |
| updated_at | timestamptz | |

Guardrail nodes reference rule IDs; lint results log rule IDs. Edits to this
table are flagged for human review (admin RLS + a change note requirement).

## 4. Explicitly deferred

- Neighbourhood objects as first-class rows (currently strings + page data) —
  needed before G7/R6 scale, not before sprint 1.
- LLM visibility tracker tables (V-suite foundation) — own spec when V1 builds.
- Metrics warehouse (ads/GSC pulls) — own spec with the ad-platform layer.

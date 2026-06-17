# LIQWD — Deal Desk & RFP Monetization (Design Doc)

> Status: **Draft for review.** Schema and RLS below are proposed, not yet migrated.
> Pricing tiers are intentionally left as TODOs for the business to fill in.

## 1. Strategy in one paragraph

LIQWD is a liquidity marketplace for new-construction inventory. The name says
it: we create **liquidity** by aggregating a curated pool of verified — and at
the top, *invited "ultra"* — realtors who can actually move units. In a
marketplace you do not charge the side that **creates** liquidity; you charge
the side that wants to **access** it. Therefore:

- **Realtors stay free.** The "ultra" tier is *earned/invited*, never bought.
  This pool is the supply moat — the thing developers pay to reach.
- **Developers pay.** Access to vetted deal-flow plus a structured deal desk is
  the product. This is the recurring-revenue, SaaS-valued asset.

Two complementary tools deliver this:

- **Feature A — Worksheet Proposals:** a realtor opens an existing project and
  submits a structured (or freeform) counter-offer on negotiable terms.
- **Feature B — RFP / Deal Desk:** a developer posts a Request for Proposal
  (new listing, bulk purchase, inventory/trouble unit, full development; buy or
  list side) that invited ultra realtors respond to.

## 2. Why this fits the existing codebase

Both features are new instances of a pattern LIQWD already runs:
`property_submissions` / `property_update_requests` — a **submitter**, an
optional **project**, a `status` lifecycle enum, a freeform **`jsonb` payload**,
admin review fields (`reviewed_by_user_id`, `reviewed_at`, `admin_notes`), an
**`audit_logs`** trail, surfaced through the **admin review-queue UI**
(`src/app/dashboard/admin/...`) and enforced by **RLS gated on approved
verification**.

Two existing facts make the fit even cleaner:

- `project_private_commercials` already carries `commission_is_negotiable`,
  `price_is_negotiable`, `incentives_are_negotiable`. The "Submit a proposal"
  CTA can surface only where the developer has marked terms negotiable, and the
  worksheet's three asks map 1:1 to these levers.
- The `profiles.role` check constraint **already includes `developer`** — the
  RFP author role exists; it simply has no UI yet.

## 3. Monetization matrix

| Stream | Who pays | Recurring? | Valuation quality | Verdict |
|---|---|---|---|---|
| **Developer SaaS subscription** (portal + deal-desk seats, tiered by # active projects / RFPs / seats) | Developer | Yes | Highest multiple | **Primary — the core asset** |
| **Metered RFP postings / boosts / featured placement** | Developer | Semi | Good | Secondary / expansion revenue |
| **Success / transaction fee** on `accepted` proposal or `awarded` RFP | Developer (or split) | No | Lumpy, hard to enforce | Pilot cash, not the SaaS story |
| **Ultra realtor tier** | — (free / invited) | — | — | **Not revenue — it is the supply moat** |

**Valuation rationale.** Predictable SaaS subscription revenue trades at a far
higher multiple than transactional/brokerage take-rate. Weighting the model
toward developer **subscription** rather than per-deal success fees can be worth
multiples on the same dollar of revenue. Keep success fees as optional upside;
never let them become the headline number.

## 4. Build cost: phased vs. full SaaS now

Estimates assume a solo dev on the current stack (review-queue pattern already
built).

| Build block | Concierge MVP (Phase 1) | Full SaaS now (adds on top) |
|---|---|---|
| Migrations: proposal + RFP tables, RLS | ~1–2 days | — (identical schema) |
| Realtor submit-proposal UI (worksheet + freeform) | ~2–3 days | — (carries forward) |
| RFP browse/respond UI for ultra realtors | ~2–3 days | — (carries forward) |
| Admin review-queue entries (reuse pattern) | ~2 days | — |
| Ultra-tier flag + gating | ~1 day | + invitation-management UI (~2 days) |
| Developer-facing portal (no UI today) | — | ~3–5 days |
| Developer self-serve onboarding | — | ~2–3 days |
| Billing (Stripe Checkout + Customer Portal + webhooks + entitlements) | — | ~1–1.5 weeks |
| Plan-limit enforcement + feature gating | — | ~3–4 days |
| Developer-direct RLS on confidential deal data | — | ~2–3 days |
| Transactional email / notifications | — | ~2–3 days |
| Expanded QA + paywall security review | light | ~3–5 days |
| **Total** | **≈2 weeks** | **≈6–8 weeks** |

**Conclusion:** full SaaS up front is ~3–4× the build. ~60–70% of the *extra*
effort is undifferentiated plumbing (billing, entitlements, portal shell,
notifications) that validates nothing about demand. The schema is identical
either way and the realtor-side UI carries forward, so phasing incurs almost no
rework (only ~1–2 days of admin-mediated routing later superseded by
developer-direct). **Recommendation: concierge first unless 2–3 developers have
already committed to pay — in which case skip straight to full SaaS.**

## 5. Feature A — Worksheet Proposals

### 5.1 Flow
Verified realtor → broker-only project detail → **"Submit a proposal"** →
chooses a mode (one table, `proposal_format` discriminator):

- **Structured worksheet** — typed *asks* (commission %, price reduction, richer
  incentives) and *consideration* (guaranteed campaign, committed buyer(s),
  volume/units, timeline, exclusivity window).
- **Freeform** — narrative for anything the worksheet does not capture.

### 5.2 Schema (proposed)

```sql
create table public.project_proposals (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  submitted_by_user_id uuid not null references public.profiles (id),
  proposal_format     text not null,           -- 'worksheet' | 'freeform'
  asks                jsonb not null default '{}'::jsonb,   -- commission_pct, price_reduction, incentive_request...
  consideration       jsonb not null default '{}'::jsonb,   -- campaign_guarantee, buyer_guarantee, units, timeline...
  narrative           text,
  valid_until         date,
  status              text not null default 'submitted',
  reviewed_by_user_id uuid references public.profiles (id) on delete set null,
  decided_at          timestamptz,
  decision_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint project_proposals_format_chk
    check (proposal_format in ('worksheet','freeform')),
  constraint project_proposals_status_chk
    check (status in ('draft','submitted','under_review','countered',
                      'accepted','declined','withdrawn','expired'))
);

-- Optional: the counter-offer negotiation thread.
create table public.proposal_messages (
  id             uuid primary key default gen_random_uuid(),
  proposal_id    uuid not null references public.project_proposals (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id),
  body           text,
  terms_snapshot jsonb not null default '{}'::jsonb,  -- the offer as of this round
  created_at     timestamptz not null default now()
);
```

### 5.3 Lifecycle
`draft → submitted → under_review → (countered ⇄ under_review) → accepted | declined | withdrawn | expired`

### 5.4 RLS sketch
- A realtor can `insert` a proposal for themselves and `select` only their own.
- Admin can `select`/`update` all (Phase 1 reviewer).
- Phase 2: developer can `select`/`act` on proposals for projects they own.

### 5.5 UI surfaces
- **Realtor:** "Submit a proposal" CTA on project detail (gated on negotiable
  flags); "My proposals" list with status + thread.
- **Admin:** new review-queue tab mirroring `dashboard/admin/updates`.

## 6. Feature B — RFP / Deal Desk

### 6.1 Flow
A `developer` (or admin) posts an RFP for a listing mandate, bulk unit purchase,
inventory/trouble unit, or whole development — buy or list side. Only invited
ultra realtors see it and respond.

### 6.2 Ultra gating — coarse tier + fine invite
- Add `profiles.realtor_tier` (`'standard' | 'ultra'`) — gate into the
  marketplace at all.
- `deal_rfp_invitations` — target a specific RFP to named realtors.

### 6.3 Schema (proposed)

```sql
create table public.deal_rfps (
  id                 uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.profiles (id),
  project_id         uuid references public.projects (id) on delete set null,
  rfp_type           text not null,   -- new_listing | bulk_purchase | inventory_unit | trouble_unit | full_development
  deal_side          text not null,   -- buy | list
  title              text not null,
  brief              text,
  target_units       integer,
  target_price       numeric(14,2),
  deadline_at        timestamptz,
  visibility         text not null default 'invited',  -- invited | all_ultra
  status             text not null default 'draft',     -- draft | open | shortlisting | awarded | closed | cancelled
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint deal_rfps_type_chk
    check (rfp_type in ('new_listing','bulk_purchase','inventory_unit','trouble_unit','full_development')),
  constraint deal_rfps_side_chk check (deal_side in ('buy','list')),
  constraint deal_rfps_visibility_chk check (visibility in ('invited','all_ultra')),
  constraint deal_rfps_status_chk
    check (status in ('draft','open','shortlisting','awarded','closed','cancelled'))
);

create table public.deal_rfp_invitations (
  id                 uuid primary key default gen_random_uuid(),
  rfp_id             uuid not null references public.deal_rfps (id) on delete cascade,
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  invited_by_user_id uuid references public.profiles (id) on delete set null,
  status             text not null default 'invited',
  created_at         timestamptz not null default now(),
  constraint deal_rfp_invitations_unique unique (rfp_id, profile_id)
);

create table public.deal_rfp_proposals (
  id                  uuid primary key default gen_random_uuid(),
  rfp_id              uuid not null references public.deal_rfps (id) on delete cascade,
  submitted_by_user_id uuid not null references public.profiles (id),
  price_offer         numeric(14,2),
  units               integer,
  conditions          jsonb not null default '{}'::jsonb,
  narrative           text,
  status              text not null default 'submitted',  -- submitted | shortlisted | awarded | declined | withdrawn
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint deal_rfp_proposals_status_chk
    check (status in ('submitted','shortlisted','awarded','declined','withdrawn'))
);
```

### 6.4 RLS sketch (confidential — the critical part)
- `deal_rfps`: visible to admin, the owner, and (invited realtors OR all ultra
  realtors when `visibility = 'all_ultra'`). Mirrors the existing broker-only
  confidential-data model.
- `deal_rfp_proposals`: each proposal visible only to its author + the RFP owner
  + admin.
- Only `realtor_tier = 'ultra'` (and approved) may insert proposals.

### 6.5 UI surfaces
- **Developer/admin:** create RFP, manage invitations, review/shortlist/award.
- **Ultra realtor:** "Deal Desk" list of eligible RFPs; respond form.

## 7. Phasing plan

- **Phase 1 — Concierge (admin-mediated).** Ship A & B onto the existing
  review-queue UI. Sign 3–5 developers manually. Proves willingness to pay
  before building the portal. Same tables as Phase 2.
- **Phase 2 — Developer SaaS portal.** Self-serve developer access to the *same*
  tables via new RLS + Stripe billing + entitlements + notifications.
- Success/transaction fees: optional in Phase 1 as upside; never the headline.

## 8. Cross-cutting
- Every state transition writes an `audit_logs` row (`entity_type`,
  `entity_id`, `action`, `metadata`).
- Reuse status-label/tone conventions in `src/lib/status.ts` for new badges.
- Add TS types to `src/lib/types.ts` mirroring the new tables.

## 9. Open decisions (TODO — business)
- [ ] **Counterparty for v1:** admin-mediated (recommended) vs developer-direct
      vs hybrid.
- [ ] **Pricing tiers:** subscription tiers, what is included vs metered,
      success-fee yes/no and %.
- [ ] **Ultra criteria:** how a realtor earns/keeps `ultra` status.
- [ ] **Lead routing / exclusivity:** how an `awarded` RFP or `accepted`
      proposal hands off to fulfillment.

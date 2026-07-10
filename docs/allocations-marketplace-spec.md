# LIQWD Allocations Marketplace — Product & Data Spec

**Status:** Draft for legal review + build. Nothing here ships before a Toronto
real-estate lawyer signs off on the fee structure and the allocation mechanic.

**One-line:** A gated, two-mode marketplace where developers post
pre-construction **allocations** (the right to market/sell specific units) and
RECO-verified agents compete for them — monetized on flat access fees, never a
cut of any commission.

---

## 1. Why this is compliant by design (the load-bearing decisions)

These are the architectural choices that keep LIQWD a *platform*, not a
brokerage. They are non-negotiable constraints on the build.

1. **An allocation is not a trade.** We record "Agent A @ Brokerage B received
   an allocation to market Unit 1203 at Project X." The actual trade (the APS
   between buyer and developer) happens later, through the agent's brokerage,
   entirely off our rails. We facilitate the introduction/allocation, full stop.
2. **LIQWD never takes commission.** Revenue is flat access fees, subscriptions,
   or **credits** — the exact model already live for `buyer_mandates`
   (`mandate_connect_credits` / `developer_mandate_access`). **No percentage of
   commission. No fee contingent on a trade closing.** A fixed "unlock this
   allocation" fee is fine; "we take X% of the resulting deal" is prohibited.
3. **LIQWD is never a party to the commission agreement.** The agreed co-op %
   is stored only as reference data (for heat analytics and the audit trail);
   the commission contract is executed developer ↔ brokerage. UI states this
   explicitly.
4. **Gated, never public.** Allocations are visible only in the realtor-only and
   developer-only authenticated views. No consumer/buyer ever sees a commission
   auction. Enforced by RLS, mirroring `buyer_mandates_developer_view`.
5. **Verified agents only.** Only `verification_status = 'approved'` realtors can
   bid or receive an allocation. Our RECO gate becomes a *compliance asset* — we
   only ever allocate to licensed agents.
6. **Full audit trail.** Every bid, award, and outcome is timestamped and
   immutable, so the mechanic is auditable if RECO ever asks.

**Competition Act note (in our favour):** a transparent, agent-driven commission
bid-down is *pro-competitive* — the Competition Bureau has historically pushed
for commission competition, not against it.

---

## 2. The two modes

Kept cleanly separate in product — different psychology, different UI.

| | **Hot Allocation (bid-down)** | **Inventory Clearance (bid-up)** |
|---|---|---|
| Trigger | Scarce/hot units, more agent demand than supply | Stale/hard-to-move units |
| Who competes | Agents compete for *access* | Agents name the incentive they need |
| Bid axis | Agent offers a **lower** co-op and/or added value (marketing plan, close-rate) | Agent states the **higher** co-op they'd need to move it; developer offers a premium |
| Bounded by | **Floor** co-op % (soft cap — no race to zero) | **Ceiling** co-op % (soft cap — no gouging the developer) |
| Aligns with | Agent equilibrium play (smaller cut of a real deal > 100% of nothing) | Developer's most expensive problem (unsold inventory) |

Both are the same object with a `mode` flag and mode-aware bounds.

---

## 3. Data model

Builds on existing tables (`profiles` with developer role, `projects`,
`buyer_mandates` billing rails). New tables:

### `developer_orgs` *(if not already implied by developer profiles)*
A developer company; may have multiple member logins. If the current model is
one developer = one profile, this can be deferred and `developer_org_id` can be
a profile id in phase 1.
```
id uuid pk
name text
verified boolean default false          -- admin-verified the developer is legit
primary_contact_profile_id uuid
created_at timestamptz
```

### `project_developer_links`
Which developer controls which project (authority to post allocations for it).
Admin-granted to prevent a developer posting allocations on inventory they don't
represent.
```
id uuid pk
project_id uuid → projects
developer_org_id uuid → developer_orgs   -- (or profile_id in phase 1)
verified_by_admin boolean default false
created_at timestamptz
unique (project_id, developer_org_id)
```

### `allocations`  — the core object
```
id uuid pk
project_id uuid → projects
developer_org_id uuid                    -- the vendor posting it
created_by_profile_id uuid
mode text check (mode in ('hot','clearance'))
unit_label text                          -- "Unit 1203" or "5 units, floors 10-12"
unit_count int default 1
base_coop_pct numeric                    -- developer's standard co-op
floor_coop_pct numeric                   -- hot mode: lowest allowed bid (soft cap)
ceiling_coop_pct numeric                 -- clearance mode: highest allowed bid (soft cap)
blind boolean default true               -- true = agents don't see others' bids (dampens race-to-bottom)
notes text
status text check (status in ('draft','open','awarded','withdrawn','expired')) default 'draft'
opens_at timestamptz
closes_at timestamptz                    -- time-boxed (48–72h typical)
awarded_bid_id uuid
awarded_profile_id uuid
awarded_at timestamptz
posting_fee_credits int default 0        -- what the developer spent to post (flat/credit)
created_at timestamptz
```

### `allocation_bids`
```
id uuid pk
allocation_id uuid → allocations
profile_id uuid → profiles               -- must be approved realtor
brokerage_name text                      -- snapshot at bid time
coop_pct numeric                         -- hot: <= base & >= floor; clearance: >= base & <= ceiling
value_add text                           -- marketing commitment / why me
close_rate_snapshot numeric              -- from agent_performance at bid time
status text check (status in ('submitted','leading','won','lost','withdrawn')) default 'submitted'
created_at timestamptz
unique (allocation_id, profile_id)       -- one live bid per agent per allocation
```

### `allocation_awards`  — the "connect the dots" artifact (NOT a trade)
```
id uuid pk
allocation_id uuid → allocations
bid_id uuid → allocation_bids
profile_id uuid                          -- the awarded agent
developer_org_id uuid
agreed_coop_pct numeric                  -- REFERENCE ONLY — LIQWD is not a party
awarded_at timestamptz
expires_at timestamptz                   -- allocation validity window (e.g. 30–60 days to produce)
outcome text check (outcome in ('pending','sold','expired','released')) default 'pending'
outcome_reported_at timestamptz
outcome_reported_by uuid
```

### `agent_performance`  — reputation / accountability on both sides
```
profile_id uuid pk → profiles
allocations_won int default 0
allocations_sold int default 0
close_rate numeric                       -- sold / won
avg_days_to_close numeric
rating numeric                           -- optional developer rating
updated_at timestamptz
```
Recomputed from `allocation_awards.outcome`. Prevents bid-down becoming a
pure race to the bottom (developers weigh price *and* proven close-rate) and
stops bid-up from attracting agents who bid high and never close.

### Billing — reuse existing rails
No new billing primitives. Developers spend `mandate_connect_credits` (or a
subscription tier via `developer_mandate_access`) to **post** an allocation
and/or to **see full agent detail** on bids — exactly as they already spend to
connect on `buyer_mandates`. Agents bid **free** (supply-side stays
frictionless, per the "realtors have no money, developers do" thesis). All
fees are flat/credit; a `credit_ledger` entry references the allocation. Never
a % of commission.

### Market-heat analytics — the monetizable data product
Derived (view or scheduled rollup), not a hand-authored report:
```
per project / city / time window:
  open allocations, bids per allocation, avg winning co-op,
  avg time-to-award, sell-through rate (sold / awarded), demand index
```
This is proprietary — *real agent behaviour*, not self-reported absorption.
Sold to developers as a portfolio dashboard / subscription tier. This is the
"sell the data, not the leads" play, and it exists only because we run the
auction.

---

## 4. Flows

### Developer posts an allocation
1. Verified developer selects a project they're linked to
   (`project_developer_links.verified_by_admin`).
2. Defines: mode, unit(s), base co-op, floor **or** ceiling, blind on/off,
   time-box (`opens_at`/`closes_at`).
3. Spends a posting credit (or covered by subscription). `status → open`.
4. Appears in the realtor-only view, targeted to relevant agents (project's
   city/market; verified only).

### Agent bids
1. Verified realtor browses open allocations (gated view, filtered to markets
   they serve).
2. Submits a mode-aware bid + value-add; `close_rate_snapshot` auto-attached.
3. Blind mode: sees only own bid + a rank hint. Open mode: sees the leading co-op.
4. Bidding is free for agents.

### Award
1. At `closes_at` (or developer awards early), developer reviews bids **with
   reputation scores**, not just price.
2. Developer awards → `allocation_awards` row created, `status → awarded`,
   both parties notified.
3. **The commission agreement + trade execute off-platform, brokerage ↔
   developer.** UI reminds both sides LIQWD is not a party.

### Outcome tracking
1. Within the allocation window, developer/agent reports `sold | expired |
   released`.
2. Feeds `agent_performance` + market-heat analytics.

---

## 5. Views & access (RLS)

- **Developer-only** (`isDeveloper`/`isAdmin`): create/manage own allocations,
  see bids on them (full agent detail gated behind a credit/subscription, like
  `buyer_mandates`), award, report outcomes, portfolio heat dashboard.
- **Realtor-only** (`verification_status='approved'`): browse open allocations
  in their markets, bid, see own awards, see own performance.
- **No public/consumer surface at all.** Not in the sitemap, not in
  `public_projects_view`, robots-excluded. RLS policies mirror the existing
  mandate policies.

---

## 6. Fee model summary (for the lawyer)

| Event | Charge | Party | Safe? |
|---|---|---|---|
| Post an allocation | Flat / credit | Developer | ✅ access fee |
| See full bid detail | Credit / subscription | Developer | ✅ (same as mandates today) |
| Bid on an allocation | Free | Agent | ✅ |
| Heat dashboard | Subscription | Developer | ✅ data product |
| — | **% of commission** | — | ❌ never |
| — | **fee contingent on trade closing** | — | ❌ never |

Standard disclaimer to surface in-product:
> LIQWD facilitates introductions and allocations between developers and
> licensed real-estate agents. LIQWD is not a brokerage, is not a party to any
> trade or commission agreement, and charges only platform-access fees.

---

## 7. Phasing

- **Phase 0 — Legal.** Lawyer sign-off on the fee structure + allocation
  mechanic + the disclaimer language. Gate on everything below.
- **Phase 1 — MVP (clearance/bid-up first).** Cleaner, developer-funded, aligns
  with monetization. Developer posting + agent bidding + award + manual outcome,
  gated views, flat/credit posting fee (reuse mandate rails), audit trail.
- **Phase 2 — Hot/bid-down mode + reputation scoring.** Add `agent_performance`,
  blind bidding, floor caps.
- **Phase 3 — Market-heat dashboard.** The monetizable data product; portfolio
  analytics for multi-project developers.

---

## 8. Open questions for the lawyer

1. Does a flat "unlock/post" fee for an allocation introduction sit clearly
   outside "remuneration for a trade" under TRESA? (We believe yes — it's an
   access/advertising fee, like a portal.)
2. Any RECO disclosure obligation triggered by recording `agreed_coop_pct` as
   reference data, given it's gated and LIQWD is not a party?
3. Confirm that granting an "allocation" (right to market inventory) to a
   licensed agent is not itself "trading" requiring registration by LIQWD.
4. Inducement rules: does surfacing a developer's co-op offer to agents count as
   an inducement, and if so what disclosure is needed?
5. Bid-down transparency vs. any RECO rule on commission — confirm the
   Competition Act reading holds provincially.

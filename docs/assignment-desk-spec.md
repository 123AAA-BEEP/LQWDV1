# LIQWD Assignment Desk — Product & Data Spec

**Status:** Draft for build + light legal review. The mechanic itself is
low-risk (a gated listing board, not a transaction platform), but the
builder-consent and TRESA-advertising posture below should get a Toronto
real-estate lawyer's eyes before launch.

**One-line:** A gated, realtor-only board where verified agents list
pre-construction **assignments** (a buyer's existing pre-con contract being
resold before closing) and other verified agents discover and connect on them.
Monetized on credits / Pro access, never a cut of any commission or assignment
profit.

**Why now:** Pre-con assignments are a genuinely under-served niche in Ontario
— high-urgency, emotionally charged, and with no clean dedicated tool (agents
trade them in WhatsApp groups and scattered spreadsheets today). It is the
secondary-market sibling of the primary-market **Allocations Marketplace**
(`docs/allocations-marketplace-spec.md`): same gated DNA, same "LIQWD is never
in the trade" stance, same credit rails. Building this de-risks and informs
that build.

---

## 1. The load-bearing decisions (non-negotiable constraints)

These keep LIQWD a *platform / matchmaking board*, never a party to an
assignment or a brokerage.

1. **An assignment listing is not a trade.** We record "Agent A is marketing an
   assignment of Unit 1203 at Project X." The actual assignment agreement
   (assignor ↔ assignee, plus the builder's consent) executes off our rails,
   through the agents' brokerages. We facilitate discovery, full stop.
2. **Gated, never public.** Assignments are visible **only** in the
   realtor-only authenticated view. No consumer, developer, or admin-public
   surface ever renders them. This is the single decision that resolves the
   developer-relations concern (see §2). Enforced by RLS, mirroring
   `off_market_listings`.
3. **Verified agents only.** Only `verification_status = 'approved'` realtors
   read the board or post to it. Our RECO gate is the compliance asset: we only
   ever surface assignments among licensed agents.
4. **Builder-consent is attested, never assumed.** Every listing carries a
   `builder_consent_status` the posting agent sets and attests to. LIQWD does
   not verify it and is not a party to it. The UI says so.
5. **LIQWD never takes a cut.** Revenue is credits / Pro access to post or to
   reveal a listing's contact — the model already live for `buyer_mandates`
   (`mandate_connect_credits` / `developer_mandate_access`). **No percentage of
   the assignment profit, no fee contingent on the assignment closing.**
6. **Not resale.** This board is pre-construction assignments only. General
   residential resale is explicitly out of scope — it dilutes the
   new-construction positioning and competes with the MLS on its own turf. See
   §8.

---

## 2. The developer-relations problem, and why gating solves it

The historical hesitation: developers don't like assignments being *publicly*
listed. The reasons are specific, and every one of them is a **public-signal**
problem:

- A public "assignment available" post signals the project isn't selling.
- It advertises a discount that undercuts the developer's remaining inventory.
- Many APS assignment clauses restrict *public* marketing of the assignment.

A realtor-only, non-indexed, gated board produces none of those signals. It is
the difference between "flipping assignments in public" (a developer landmine)
and "an agent quietly finding another agent's client for an assignment" (normal
brokerage activity). The board must therefore be:

- **Never in the public site, sitemap, or search** (`robots noindex`, no public
  route, RLS-gated — same treatment as the buyer portal and off-market board).
- **Framed as agent-to-agent matchmaking**, not a consumer marketplace.
- **Builder-consent-aware** (§4), so the norm on the board is "consent obtained
  or in progress," not "list first, ask later."

---

## 3. Data model

A **dedicated** `assignment_listings` table (sibling to `off_market_listings`,
not a row type inside it — keeps the two feeds cleanly separate per the
"don't cloud up the off-market stuff" requirement). Enums as `text + CHECK`,
matching the schema's house style.

```sql
create table public.assignment_listings (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid not null references public.profiles(id) on delete cascade,

  -- Link to a LIQWD project when it's one we track (enables project-page
  -- cross-refs + market context); nullable so off-catalogue projects still list.
  project_id uuid references public.projects(id) on delete set null,
  project_name text not null,          -- snapshot / free-text when project_id is null
  city_region text not null,

  -- The unit
  unit_label text,                     -- "Unit 1203", "Lot 44", etc.
  beds numeric(3,1),
  baths numeric(3,1),
  size_sqft integer check (size_sqft is null or size_sqft > 0),
  floor_or_level text,
  exposure text,                       -- N/S/E/W, "SW corner", etc.
  parking integer,
  locker boolean,

  -- The economics (agent-entered; reference data, LIQWD is not a party)
  original_purchase_price numeric(15,2) check (original_purchase_price is null or original_purchase_price >= 0),
  assignment_price        numeric(15,2) not null check (assignment_price >= 0),  -- the ask
  deposit_paid_to_date    numeric(15,2) check (deposit_paid_to_date is null or deposit_paid_to_date >= 0),
  co_op_commission_note   text,        -- free-text; NOT a % LIQWD brokers

  -- Timing
  occupancy_estimate      text,        -- interim occupancy window
  final_closing_estimate  text,

  -- The load-bearing compliance field
  builder_consent_status text not null default 'unknown' check (
    builder_consent_status in (
      'unknown', 'not_required', 'consent_pending',
      'consent_obtained', 'assignment_prohibited'
    )
  ),
  builder_assignment_fee numeric(15,2), -- the builder's own assignment fee, if known

  notes text,
  document_paths text[] not null default '{}',  -- private bucket; signed URLs only

  -- Contact snapshot (captured at write time, like off_market_listings)
  realtor_name text not null,
  brokerage_name text not null,
  contact_phone text not null,
  contact_email text not null,

  -- Lifecycle
  status text not null default 'active' check (
    status in ('active', 'under_contract', 'assigned', 'withdrawn', 'expired')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Notes:
- `co_op_commission_note` and `builder_assignment_fee` are **reference data
  only** — never a percentage LIQWD calculates or takes, mirroring the
  allocations spec's treatment of the co-op %.
- `document_paths` reuses the **private** `project-documents`-style pattern
  (or a dedicated `assignment-documents` private bucket): the assignment APS
  page, worksheet, or floor plan, shown to a connecting agent via short-lived
  signed URLs — never a public URL. Same discipline as the buyer portal.

### RLS (mirror `off_market_listings`)

```sql
alter table public.assignment_listings enable row level security;

-- SELECT: every approved realtor browses the whole board (admins too).
create policy assignment_select on public.assignment_listings
  for select using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role = 'admin'
             or (p.role = 'realtor' and p.verification_status = 'approved')))
  );

-- INSERT/UPDATE/DELETE: owner only, and only if an approved realtor.
create policy assignment_insert on public.assignment_listings
  for insert with check (
    realtor_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'realtor'
        and p.verification_status = 'approved')
  );
create policy assignment_update on public.assignment_listings
  for update using (realtor_id = auth.uid()) with check (realtor_id = auth.uid());
create policy assignment_delete on public.assignment_listings
  for delete using (realtor_id = auth.uid());
```

Developers and the public get **no** grant and no policy path — identical to
how off-market stays invisible to them.

---

## 4. Compliance posture (Ontario-specific)

LIQWD is a listing/discovery board, not a transaction platform — the same
"never in the trade" stance as allocations. Concretely:

- **Builder consent is the agent's responsibility.** The `builder_consent_status`
  field + an attestation checkbox at post time ("I have the right to market this
  assignment and will obtain builder consent as required"). LIQWD does not
  verify and is not liable — same disclaimer discipline as the buyer-portal
  materials ("provided by the agent, not verified by LIQWD").
- **TRESA advertising:** because the board is gated realtor-to-realtor and never
  public, consumer-facing advertising rules are not triggered by the listing
  itself. Any downstream public marketing of the assignment (by the agent, off
  LIQWD) is the agent's compliance responsibility. State this in the post flow.
- **HST / assignment-tax + profit:** entirely the assignor/assignee and their
  advisors' domain. LIQWD stores prices as reference data and renders a
  standing note that assignment taxation is complex and outside LIQWD's scope.
- **Not a party to any agreement:** the assignment agreement and the builder's
  consent execute off our rails. UI states this explicitly, once, clearly.

---

## 5. Surfaces

- **`/dashboard/assignments`** (realtor-only, gated by `isApproved`): the board
  — searchable/filterable (city, project, price band, occupancy window,
  consent status), card grid mirroring the off-market board's components.
- **Post / edit form**: the fields above, the private-document uploader (reuse
  the buyer-portal upload pattern), the attestation checkbox, and the
  compliance note.
- **Connect flow**: an interested agent reveals contact / sends an intro — reuse
  the off-market **invite/claim** rails (`0044`/`0052`) or a simple
  contact-reveal gated on credits. Every connect is logged (audit trail).
- **Sidebar**: a realtor-only entry, sibling to "Off-Market", clearly separate
  so the two feeds never blur.
- **Cross-ref**: when `project_id` is set, the broker project view can show a
  discreet "N active assignments" chip (realtor-only) linking to the board —
  ties the desk into the catalogue without leaking to the public page.

---

## 6. Monetization

Consistent with the flat-fee/credit model (never a cut):
- **Posting** an assignment: free, or a small credit cost to keep quality high.
- **Revealing contact / connecting** on a listing: a credit sink (the natural
  place to charge — it's the moment of value), or bundled into Pro.
- **Pro**: unlimited posts + connects, priority placement. Same lever as the
  rest of the product.

No fee is ever contingent on an assignment closing.

---

## 7. Go-to-market (correcting the source idea)

The board is **realtor-facing** — market it to agents, who bring their
assignment inventory. Do **not** run the "post in r/TorontoRealEstate /
r/canadahousing" tactic from the source note:
- It contradicts the gating (a private realtor-only board has nothing public to
  link, and blasting assignments publicly recreates the developer landmine §2).
- Those subs are aggressively anti-realtor-self-promotion; it earns bans and
  reputational screenshots, not evangelism.

Correct channels: the existing recruit-wave machinery (an "assignments desk is
live" wave to verified/target agents), the weekly digest, and in-product
prompts. Consumers never see it, by design.

---

## 8. Explicitly out of scope: general residential resale

A resale/"residential" cross-promote board was floated alongside this. It is
**not** part of this spec and should not ship with it:
- It converts LIQWD from "the new-construction platform" into a worse
  Realtor.ca/MLS, competing with entrenched incumbents (BrokerBay, office
  exclusives) with no data moat and a diluted identity.
- Resale is over-served; assignments are under-served. Build where the
  asymmetry favours us.
Assignments stay on-brand because an assignment *is* a pre-construction
contract. Resale is a different asset class and a different company.

---

## 9. Phasing

- **Phase 0 (½ day, no code):** lawyer eyes on the attestation wording +
  builder-consent posture + the standing tax/consent disclaimers.
- **Phase 1 (build):** `assignment_listings` table + RLS + private doc bucket;
  `/dashboard/assignments` board + post/edit form + attestation; sidebar entry;
  broker-project cross-ref chip. Rides entirely on off-market + buyer-portal
  rails already built.
- **Phase 2:** connect/invite flow + credit gating + audit log.
- **Phase 3:** an "assignments live" recruit wave + digest inclusion.
- **Later:** automation (auto-match an assignment to agents whose buyer mandates
  fit; ties into `buyer_mandates`).

Roughly a day for Phase 1 given how much infrastructure already exists.

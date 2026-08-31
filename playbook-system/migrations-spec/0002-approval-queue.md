# Migrations-spec 0002 — Approval Queue, Change Sets & Ledgers

**Status: PROPOSED — founder review required before any migration is written.**

Every suite stages into one queue; nothing publishes without passing through
it. LQWDV1 already runs several implicit approval flows (project submissions,
update requests, verification queue, microsite draft→live) — this spec adds
the *generic* queue the playbooks share, without migrating existing flows.

## 1. `approval_items` — the queue

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| playbook | text | tool id, e.g. "W1", "A1", "C2", "G4" |
| run_id | uuid | groups items staged by one run |
| item_type | text | page_draft \| content_draft \| change_set \| outreach_draft \| gbp_draft \| ad_draft |
| subject_kind | text | project \| realtor \| property(site) \| campaign \| location |
| subject_id | text | |
| payload | jsonb | the FULL draft — structured JSON against the component library / field map, never raw HTML |
| plain_summary | text | the decision as a human reads it ("Pause 2 ads that spent $211 with 0 leads?") + core-argument line for articles |
| claims_manifest | jsonb | [{claim, source}] — every factual claim + its Vault source |
| lint_results | jsonb | [{rule_id, severity, pass, detail}] — block-severity failure ⇒ status can never reach approved |
| triage | jsonb | O4 pre-pass output: {disposition: approve_rec \| minor_fixed \| unfit \| escalate, reason} |
| status | text | staged \| triaged \| approved \| rejected \| published \| discarded |
| approver_profile_id | uuid | who decided |
| decided_at | timestamptz | |
| published_at | timestamptz | |
| created_at | timestamptz | |

RLS: admin full; realtors see and decide items where `subject_kind='realtor'
and subject_id = their profile` (their own pages/posts), never anyone else's.
**Invariant enforced in the service layer AND a DB check:** `status='approved'`
requires zero `severity='block'` lint failures — compliance beats approval.

## 2. `change_sets` — platform mutations (ads / GBP / sends)

An `approval_items` row with `item_type='change_set'` whose payload is:

```
{ platform: "google_ads" | "meta" | "gbp" | "email",
  account_ref, entity_kind, entity_id,
  mutations: [{field, before, after}],
  mapping_table: [...],          // the human-readable ID mapping (A2 rule)
  side_effects: "text",          // named second-order effects (spend mechanics)
  caps_checked: {cap, value, limit} }
```

## 3. `change_ledger` — append-only record of every external write

| column | type | notes |
|---|---|---|
| id | bigint PK | |
| approval_item_id | uuid → approval_items | null for system writes (pacing, rollbacks) |
| platform | text | |
| account_ref | text | |
| entity | text | |
| action | text | |
| before | jsonb | |
| after | jsonb | |
| actor | text | playbook id or "human:<profile_id>" |
| reason | text | |
| rollback_info | jsonb | how to undo, captured at write time |
| created_at | timestamptz | |

Append-only: no UPDATE/DELETE grants to anyone, including service paths that
aren't the writer function. Sibling ledgers later (outreach send ledger,
profile-change ledger with pacing state) follow this shape — specced with
their suites.

## 4. Spend-safety service (schema hooks only, service specced with Smart Ads)

`spend_caps` (account_ref, cap_kind, limit, window) and `cooldowns`
(entity_ref, until, reason) — read by the central enforcement service so no
playbook can exceed rails even if its prompt fails. Enforcement lives in code,
caps live in data.

## 5. API surface (Next.js server actions / routes — build ticket, not schema)

stage(items[]) · triage(run) [O4] · list(queue filters) · approve(id) ·
reject(id, reason) · publish(id) [dispatches by item_type to the page deploy /
platform layer / send infra, writes change_ledger] — every transition logged.

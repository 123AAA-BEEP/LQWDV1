# Migrations-spec 0002 — Approval Queue, Change Sets & Ledgers

**Status: PROPOSED — founder review required before any migration is written.**

## In plain English

This is the **outbox with a lock on it**. Everything the AI tools produce —
a page, an article, an ad, a social post, a review reply, an email — lands
here as a draft first, and needs a human tap to go public. One narrow
exception: automated *safety* actions (spend pacing, emergency rollbacks)
act without waiting for a tap — but they write to the same permanent log as
everything else. Three guarantees:

1. **Every draft arrives explained.** Not a wall of settings — one plain
   sentence ("Pause 2 ads that spent $211 with 0 leads?") plus a list of every
   factual claim in the draft and where each one came from. A draft missing
   its summary or claims list can't be approved (database rule, §1).
2. **Compliance beats everyone, including you.** If a draft fails a
   block-level compliance rule (missing brokerage ID, an unsourced stat), it
   cannot reach approved OR published — the database itself refuses the
   status change (§1). Even an accidental approve can't ship a violation.
3. **Everything is on the record.** Every change the system makes out in the
   world (an ad edited, a post published, an email sent) is written to a
   permanent log — who, what, why, and how to undo it. No role has
   permission to edit or delete log rows, and a database trigger rejects any
   attempt (§3); only a direct superuser in the SQL editor could bypass it,
   and that access is already the keys to everything.

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
| plain_summary | text NOT NULL CHECK (length(trim(plain_summary)) > 0) | the decision as a human reads it ("Pause 2 ads that spent $211 with 0 leads?") + core-argument line for articles |
| claims_manifest | jsonb | [{claim, source}] — every factual claim + its Vault source; REQUIRED (non-empty) for claim-bearing item_types (page/content/outreach/gbp/ad drafts), enforced by the approved-status check below |
| lint_results | jsonb | [{rule_id, severity, pass, detail}] — block-severity failure ⇒ status can never reach approved |
| triage | jsonb | O4 pre-pass output: {disposition: approve_rec \| minor_fixed \| unfit \| escalate, reason} |
| status | text | staged \| triaged \| approved \| rejected \| published \| discarded |
| approver_profile_id | uuid | who decided |
| decided_at | timestamptz | |
| published_at | timestamptz | |
| created_at | timestamptz | |

RLS: admin full; realtors see and decide items where `subject_kind='realtor'
and subject_id = their profile` (their own pages/posts), never anyone else's.
**Invariants enforced in the service layer AND at the DB (trigger/check):**
- `status IN ('approved','published')` requires zero `severity='block'` lint
  failures — compliance beats approval, at both gates.
- `status='published'` requires a prior `approved` transition (decided_at +
  approver set) — publish cannot skip the human.
- `status='approved'` requires non-empty `plain_summary`, and a non-empty
  `claims_manifest` for claim-bearing item_types.

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

Append-only, enforced twice: (a) no UPDATE/DELETE grants to any role — the
writer path holds INSERT only; (b) a `BEFORE UPDATE OR DELETE` trigger that
raises unconditionally, so even the table owner / service_role can't mutate
rows through normal SQL (a superuser dropping the trigger in the SQL editor
remains possible — that access level is already total). Sibling ledgers later
(outreach send ledger, profile-change ledger with pacing state) follow this
shape — specced with their suites.

## 4. Spend-safety service (schema hooks only, service specced with Smart Ads)

`spend_caps` (account_ref, cap_kind, limit, window) and `cooldowns`
(entity_ref, until, reason) — read by the central enforcement service so no
playbook can exceed rails even if its prompt fails. Enforcement lives in code,
caps live in data.

## 5. API surface (Next.js server actions / routes — build ticket, not schema)

stage(items[]) · triage(run) [O4] · list(queue filters) · approve(id) ·
reject(id, reason) · publish(id) [dispatches by item_type to the page deploy /
platform layer / send infra, writes change_ledger] — every transition logged.

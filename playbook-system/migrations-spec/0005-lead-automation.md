# 0005 — Lead automation: the spine from "lead arrives" to "agent calls"

**Status: PROPOSED (founder question, 2026-09-02). No migration is written until this is approved.**

## In plain English

An inquiry arrives. Today we email the agent and stop. The lead hears
nothing back, nobody is told to pick up the phone, and if the agent is at
a showing the lead is cold by dinner. This spec makes the first hour
automatic and the first two weeks disciplined:

1. **Agent is told, the way they asked to be told** — email, text, or app
   push, with quiet hours.
2. **The lead is told we got it, immediately** — email or text, in the
   agent's name and voice, with the agent's RECO identification block.
3. **A "Call {name} now" task appears on the agent's Home**, with a timer,
   because the phone call is still the thing that converts. Widely cited
   research puts a reply inside five minutes at many times the contact
   rate of one inside an hour; our Home already scores agents on it.
4. **A follow-up sequence runs** if the lead goes quiet: value-first
   messages on a schedule, every one stoppable, every one logged, every
   one CASL-compliant. It stops the moment the lead replies, the agent
   marks the lead, or the lead says stop.
5. **Every touch lands on the lead's timeline**, so the agent opens a lead
   and sees the whole story, and the pipeline status moves itself.

We are **not** building a CRM product. We already have one at bare-bones
scale (contacts, tasks, pipeline, newsletter) and Follow Up Boss owns the
full-CRM job for agents who want one. We are building the automation that
makes every lead get a fast reply and a phone call, and a **push to the
agent's own CRM** for those who have one, so "I already use Follow Up
Boss" is a reason to sign up, not to leave.

## What exists today (build on it, never beside it)

- `project_leads` — the pipeline: `new → contacted → qualified → won | lost
  | spam`, with `first_responded_at` stamped on the first move off `new`.
- `crm_contacts` (name, email, phone, kind, `consent_email`) and
  `crm_tasks` (title, due date, done) — the Clients page.
- Lead form actions send an ops copy and an alert email to the assigned
  agent; a realtor-lead gets a recruit email. **No acknowledgement goes to
  a buyer lead.** No SMS anywhere. A global email suppression list exists
  (`email-compliance`).
- Home's "Needs you" stack and the "Your reply time" tile.

## The flow, step by step

**T+0 — lead created** (any source: project page, microsite, lead page,
client hub, future resale lanes — source-agnostic).

- Write the lead (exists). Create/merge a `crm_contacts` row so the lead
  and the contact are one person (new: today they're disconnected).
- **Notify the agent** by their preferred channels (`agent_notification_prefs`):
  email (exists), SMS (new), push (new, PWA). Respect quiet hours — a 2 a.m.
  lead still gets its acknowledgement, the agent gets the push at 7.
- **Acknowledge the lead** on the channel the agent chose as default,
  gated by the consent the lead gave on the form: email always allowed
  (the form is an inquiry, reply is expected); **SMS only if the lead
  ticked "you can text me"**. Message: agent's name, brokerage, one
  question ("What's the best time to reach you today?"), the RECO
  identification block, an opt-out line. Drafted from a template on Free
  and Pro; Premium personalises it from the inquiry.
- **Create the task**: "Call {lead} — {project}" due now, on the agent's
  Home with a running timer. Completing it (or any status move) stamps
  `first_responded_at`.

**T+30 min — if the agent hasn't touched the lead:** a second nudge to the
agent (different channel if they have two). Not to the lead.

**T+1 h — if the lead hasn't replied:** Premium only — the conversational
layer asks one qualifying question (timeline, or budget band, or
neighbourhood), logs the answer, and hands off the moment the lead is
warm ("ready for you" task, high priority). Pro stops at the acknowledgement.

**Day 1 · 3 · 7 · 14 — follow-up sequence**, only while the lead is still
`new` or `contacted` with no reply:

| Day | Channel | Content (value-first, no pitch) |
|---|---|---|
| 1 | email | "Here's what I'd want to know about {project}" — 3 facts from the Vault |
| 3 | SMS if consented, else email | one question: "still looking in {city}?" |
| 7 | email | neighbourhood note or floor-plan update, sourced |
| 14 | email | last touch: "I'll leave it here — reply any time"; sequence ends |

Stops immediately on: lead reply, agent status change, unsubscribe/STOP,
lead marked spam, or the agent pressing "stop follow-ups" on the timeline.

**Throughout:** every send, reply, call-task, and status change is a
`lead_events` row. Status advances itself: agent touch → `contacted`;
lead reply → stays `contacted` but flagged "replied"; Premium
qualification answered → `qualified` is *suggested*, never auto-set (the
agent decides what qualified means).

## Proposed schema (for review, not yet migrated)

- `agent_notification_prefs` — profile_id, channels (email/sms/push
  booleans), quiet_hours (start/end, tz), lead_ack_channel (`email` |
  `sms_if_consented`), sequences_enabled, phone_verified_at. Owner
  read/write, admin all.
- `lead_consents` — lead_id, email_ok (default true, inquiry), sms_ok
  (form checkbox, default false), captured_at, source, ip/user-agent
  hash. Append-only; the CASL record.
- `lead_events` — lead_id, kind (`agent_notified` | `lead_acked` |
  `task_created` | `nudge` | `sequence_step` | `lead_replied` |
  `agent_note` | `status_change` | `handoff` | `stopped`), channel,
  payload (jsonb: rendered text, provider message id, template id),
  actor (`system` | `agent` | `lead`), created_at. **Append-only**, same
  trigger pattern as `change_ledger`.
- `lead_sequences` — id, name, tier (`pro` | `premium`), steps (jsonb:
  day, channel, template id), owner (null = LIQWD default; profile_id =
  agent's own copy on Premium).
- `lead_sequence_runs` — lead_id, sequence_id, step_index, next_at,
  state (`running` | `stopped` | `done`), stopped_reason, started_at.
  One running row per lead, enforced by a unique partial index.
- `crm_tasks` — add `lead_id` (nullable) and `kind` (`call_now` |
  `follow_up` | `manual`) so the call task links back and Home can rank
  it. `crm_contacts` — add `lead_id` of the originating lead.
- `message_templates` — id, channel, tier, body with merge fields,
  compliance-checked (RECO-AD-2 identification block required; CASL-2/3
  sender + unsubscribe required). Admin-write; the agent-facing "edit
  your greeting" on Premium writes a per-agent override row.
- `crm_push_targets` — profile_id, kind (`follow_up_boss` | `webhook`),
  config (jsonb, secret stored service-role only), active. The
  bring-your-own-CRM push.

Runner: a Vercel cron every 5 minutes reads `lead_sequence_runs` where
`next_at <= now()` (same pattern as domain-heal), sends via the email lib
and the SMS provider, logs, advances. Nudges use the same runner.

## Providers and cost

- **SMS:** Twilio with a Canadian long code (or a toll-free number
  verified for A2P). Canadian carriers require sender registration;
  budget a week. Roughly CA$0.01–0.02 per message, a couple of dollars a
  month per number. One LIQWD number per agent on Pro+ (so replies route
  to the right agent); Free uses email only.
- **Push:** web push through the PWA, free.
- **Email:** existing Resend path and suppression list.
- **Follow Up Boss push:** their inbound lead API takes a POST per lead
  with the agent's API key; zero cost. Generic webhook covers everyone
  else. Push, never sync — we don't read their CRM.

## Tiering

| | Free | Pro | Premium |
|---|---|---|---|
| Agent notified (email / push) | ✓ | ✓ | ✓ |
| Agent notified by SMS | — | ✓ | ✓ |
| Lead acknowledged by email | ✓ | ✓ | ✓ |
| Lead acknowledged by SMS (consented) | — | ✓ | ✓ |
| Call-now task with timer on Home | ✓ | ✓ | ✓ |
| Follow-up sequence (LIQWD default) | — | ✓ | ✓ |
| Sequence editing, personalised messages | — | — | ✓ |
| Conversational qualification until handoff | — | — | ✓ |
| Push to Follow Up Boss / webhook | — | ✓ | ✓ |

Free gets the spine because the spine is what makes leads from a LIQWD
page worth having; that is the distribution engine's reliability, and
email plus a task cost us nothing.

## Guardrails (hard, all tiers)

- **CASL:** SMS only with recorded consent; every message carries sender
  identification and a stop mechanism; STOP/unsubscribe writes to the
  same global suppression list the newsletter and outreach use (CASL-4).
- **RECO:** the identification block is in every template (RECO-AD-2);
  templates are lint-checked before they can be saved.
- **No autonomous conversation on Pro.** The conversational layer is
  Premium, capped at three exchanges before it must hand off, and never
  answers questions about price, commission, or legal terms — those
  become a "ready for you" task with the question quoted.
- **Quiet hours for the agent are never applied to the lead's
  acknowledgement**; they are applied to follow-up sends (no 3 a.m.
  texts to leads either — sends are windowed 9–8 local).
- **One running sequence per lead. Stop is instant and logged.**

## Where it shows up in the product (no new nav item)

- **Home → Needs you:** the call-now task is the top card while it's
  open, with the timer. "Your reply time" finally has a fix attached.
- **Leads → lead detail:** the timeline (every event), a "stop
  follow-ups" button, the consent flags, the push-to-CRM status.
- **Marketing plan:** the existing "Reply to every lead in seconds" card
  opens a three-question Guided setup: how do you want to be told · how
  should we greet new leads · run follow-ups if they go quiet? That's
  the whole configuration surface on Pro.
- **Account:** notification preferences (channels, quiet hours, phone
  verification) — the "settings" the reorg blueprint parked there.

## Intake sources — what may create a lead (founder question, 2026-09-02)

A lead enters this spine only from a source where **the person asked and
the consent is ours to record**:

1. **LIQWD-owned forms** — project pages, microsites, lead pages, client
   hubs, the resale lanes, the free audit. Consent captured at the form,
   `lead_consents` written at creation. The public marketplace's own
   demand, organic or ad-driven, is the intake that fuels free leads.
2. **Builder / developer registrations** — only under a contract that
   states the registrant was told their inquiry would be shared with a
   LIQWD agent, with the builder's consent record attached to ours.
3. **An agent's own contacts** — CSV import into Clients with a consent
   basis the agent attests to per row (`consent_email` exists; add
   `consent_source` + `consent_attested_at`). These become contacts, not
   leads; nothing is sent until the basis is recorded.

**Never an intake: purchased or rented lists** (e.g. bulk "70,000 real
estate leads" databases, aged or resold form-fills). CASL consent does not
transfer with a list; the rulebook's CASL-1 (consent basis recorded per
recipient) blocks every send to them; PIPEDA has no basis for LIQWD to
hold the data; and injecting people who never asked about anything into
an agent's inbox poisons the reply-time and conversion metrics the whole
product is built on. A per-lead vendor that generates exclusive inquiries
through its own ads is a different thing — a possible *partner channel*
later, priced and consented, never "free leads" and never routed through
this spine without its own consent record.

## Open decisions (founder)

1. Follow-up cadence: day 1 / 3 / 7 / 14 as above, or shorter?
2. Free tier gets the call task and email acknowledgement — confirmed?
3. Per-agent SMS numbers (clean routing, ~$2/mo each) or one shared LIQWD
   number with lead-to-agent routing by phone number?
4. Follow Up Boss first for the CRM push, then generic webhook?

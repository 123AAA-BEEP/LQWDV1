# 0004 — IDX/VOW onboarding: LIQWD as the agent's data vendor

**Status: PROPOSED (founder question, 2026-09-02). No migration is written until this is approved.**

## In plain English

An agent on the paid tier wants resale listings on their LIQWD-hosted website.
Boards don't hand that feed to the agent directly. They hand it to an
**approved technology vendor** acting for a **brokerage** that has signed the
board's data paperwork. This spec makes LIQWD that vendor and turns the
paperwork into an onboarding flow: the agent fills in a few fields we mostly
already have, the right people sign, we submit, we track it, and the feed
lands on their site. It is exactly the model every IDX provider uses; the
difference is that ours starts pre-filled from the Vault and ends inside the
approval queue and compliance lint that already exist.

Two things this flow cannot do, stated up front:

1. **It cannot make LIQWD a vendor.** That is a one-time application LIQWD
   files with each board's data-licensing arm (in the GTA, TRREB's feed is
   administered through PropTx; many other Ontario boards run on ITSO). It
   involves a vendor agreement, a fee, and a technical/display-rules review.
   Founder-side, weeks, and a hard prerequisite for everything below.
2. **It cannot sign for the brokerage.** The licensee is the brokerage, not
   the agent, so the broker of record has to sign. The flow collects that
   signature by email; it does not skip it.

## The flow, step by step (what the agent sees)

1. **Pre-filled from the Vault.** Trade name, title, RECO number, brokerage
   name and address, phone, email. Anything missing shows as "you're two
   fields away", same pattern as the brand precondition nodes. New fields we
   don't hold yet: broker of record name + email, brokerage's board
   membership (office ID).
2. **Pick the feed type, in plain words.** IDX: listings show to anyone, no
   login. VOW: visitors must register and accept terms before seeing
   listings, and some boards release more data (for example sold history) on
   VOW only. One paragraph each, no acronyms in the headline.
3. **We generate the board's forms** as PDFs with every field filled. Form
   names and versions differ by board and change over time, so the templates
   are data (admin-uploaded per board), not code.
4. **Signatures.** Agent signs in the browser. Broker of record gets an email
   link and signs. LIQWD signs as vendor. Every signature is timestamped and
   stored with the package.
5. **We submit.** No board we know of offers a public API for this, so
   submission is the signed package sent to the board's licensing contact
   with a tracking reference, by us, on the agent's behalf.
6. **Status the agent can see:** Draft → Waiting on your broker → Submitted
   → Approved (feed credentials received) → Live on your site. Nudges at
   each stall (broker hasn't signed in 3 days; board silent for 10).
7. **Feed goes live.** Credentials stored service-role only, never in a
   broker-readable column. The site binding is created, display rules and
   disclaimers are attached, refresh cadence set. The existing rulebook
   rules TRREB-DATA-1 and TRREB-DATA-2 lint the output.

## Proposed schema (for review, not yet migrated)

- `idx_boards` — one row per board we are an approved vendor for: name,
  licensing contact, form templates (storage paths), display rules (jsonb),
  VOW registration requirements, active flag. Admin-write.
- `idx_applications` — profile_id, board_id, feed_type (`idx` | `vow`),
  status (`draft` | `awaiting_broker` | `submitted` | `approved` | `live` |
  `declined` | `withdrawn`), form_data (jsonb: the filled fields), broker_of_record
  (name, email), signed_by_agent_at, signed_by_broker_at, signed_by_vendor_at,
  submitted_at, board_reference, approved_at, notes. RLS: owner read own,
  admin all, writes through server actions.
- `idx_feeds` — application_id, board_id, credentials_ref (pointer to a
  secret held outside the table, e.g. Vault/KMS or an encrypted column the
  service role alone can decrypt), status, last_sync_at, listing_count,
  error_last. No broker-readable policy at all.
- `idx_site_bindings` — feed_id → the agent's site (public page or microsite
  domain), search config (areas, property types), disclaimer text version.
- State changes append to the existing `change_ledger`.

## Guardrails

- **Hard gate:** VOW cannot go live on a site without the registration +
  terms wall enabled. Stated in the UI as "the board requires visitors to
  sign in before seeing these listings".
- **Hard gate:** a feed is bound to exactly one agent's site. Never shared,
  never re-labelled (TRREB-DATA-2).
- **Soft nudge:** "Best after: your own domain" — IDX on a `liqwd.ca/@name`
  page is allowed if the board permits it, but most agents will want it on
  their domain; the flow says so once.

## Open questions for the founder

1. Which board first? Recommendation: TRREB via PropTx, since it covers the
   GTA and most current users. Then ITSO for the rest of Ontario.
2. Fee model: the board's per-agent/vendor fees passed through, or bundled
   into the paid tier price?
3. E-signature: a hosted provider (DocuSign, Dropbox Sign) or our own
   click-to-sign with audit trail? Boards generally accept either, but
   confirm per board.
4. Who is LIQWD's licensing contact of record (the address the boards write
   back to)?

## What can be built before vendor approval lands

The whole flow up to "Submitted" (pre-fill, feed choice, form generation,
signatures, status tracking, admin view) plus the site-side search UI and a
feed adapter against sample data. The day the credentials arrive, the
adapter is pointed at the live feed. Nothing else changes.

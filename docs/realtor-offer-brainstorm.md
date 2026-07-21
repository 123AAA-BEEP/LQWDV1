# Realtor Acquisition Offer — Brainstorm (no-leads constraint)

**Context.** We need a joining offer for realtors that does NOT depend on delivering free leads
(lead capture exists on public pages, but leads are never surfaced or routed in-product, so a
leads promise can't be fulfilled today). Every idea below is grounded in an asset that already
exists in the codebase. Nothing here is implemented — this is ideation only.

**Fulfillment key**
- **NOW** — pure packaging/copy over a fully built feature; deliverable today
- **SMALL** — days of work: UI over schema/data that already exists
- **OPS** — fulfilled manually by admins using built tooling (no code)
- **FUTURE** — schema/stub exists, real feature work needed; only pitch as "coming"

---

## The five assets everything hangs on

| Asset | What's built |
|---|---|
| Deal intelligence | Broker-only commission %, negotiability flags, private incentives, internal floorplan pricing (`project_private_commercials`, `project_incentives`, `project_floorplans.price_internal`) |
| Portal consolidation | Named links to every builder's broker portal per project, plus search/filter across all Ontario pre-con inventory |
| Verified exclusivity | RECO-number verification gate; all broker data locked behind `approved` status in app + RLS |
| Public presence | SEO-indexed public project pages with an opt-in "Your representative" realtor card (photo, name, title, brokerage) |
| Contribution flows | Submit-a-project and suggest-an-update queues with admin review |

---

## A. Deal-intelligence offers (strongest built asset)

1. **"Know the commission before you commit."** See commission % and negotiability on every project before you ever pitch it. — NOW
2. **"Internal pricing access."** See internal floorplan pricing next to public prices — verified agents only. — NOW
3. **"Private incentives vault."** Broker-only incentives that never appear in public promos. — NOW
4. **"Compare commissions across the market."** Side-by-side commission view across projects/cities. — SMALL (data exists; comparison view doesn't)
5. **"Negotiability radar."** Filter to projects flagged commission-negotiable. — SMALL (flag exists; filter doesn't)
6. **"Give one, get all."** Contribute your commission/incentive intel via update requests; unlock everyone else's. — NOW
7. **"The price-sheet vault."** Brochures and price sheets behind signed URLs instead of email archaeology. — SMALL (docs + private bucket built; realtor-side list not rendered yet)

## B. Time & workflow offers

8. **"Every builder broker portal. One login."** The current headline value prop, sharpened into the offer itself. — NOW
9. **"All Ontario pre-con in one search."** City, sales-status, construction-status filters across the whole market. — NOW
10. **"Stop chasing PDFs."** One workspace replaces scattered files, stale emails, and disconnected portals. — NOW
11. **"Launch pipeline view."** Watch sales/construction status across every active project. — NOW (framing of existing data)
12. **"Update radar."** Crowd-maintained freshness — flag stale info, watch it get fixed, see your request history. — NOW
13. **"White-glove project adds."** Ask for any missing project; admins add it within 48h via the submission queue. — OPS

## C. Off-market & inventory offers (your seed idea + variants)

14. **"Post your off-market listings free."** (Your seed.) Submit flow + broker-only gating already exist; a dedicated off-market listing type is a small build. — SMALL
15. **"The assignment desk."** Post and browse pre-con **assignment sales**, broker-to-broker only. Assignments are off-MLS by nature and huge in Ontario pre-con — likely the highest-pull inventory angle here. — SMALL
16. **"Broadcast your platinum allocations."** Got VIP/platinum access to a launch? Announce availability to the verified network. — SMALL
17. **"A verified-only audience for your exclusives."** Your inventory is seen only by RECO-verified agents — never consumers, never scrapers. — NOW (the gate is built; this is the trust wrapper for 14–16)
18. **"Add a project, get the credit."** Contributor credit displayed on projects you brought to the platform. — SMALL

## D. Visibility & personal-brand offers

19. **"Your face on the project page."** Opt-in public realtor card ("Your representative") on SEO project pages. — NOW
20. **"Claim a development."** Become the named representative on a project's public page — one rep per page. — SMALL (schema field exists; admin assignment UI doesn't)
21. **"Free Google presence."** Indexable public pages carrying your name and brokerage. — NOW
22. **"Co-branding built in."** Headshot + brokerage logo hosted and rendered on your card. — NOW
23. **"Richer public card."** Bio and service area on your card. — SMALL (columns exist; no edit UI, not on card)

## E. Client-facing enablement offers

24. **"Client-ready share links."** Send buyers a clean project page with *your* card on it — no competitor branding, no builder spin. — NOW
25. **"Custom CTAs on shared pages."** Tailored call-to-action text per project page. — NOW (admin-set today)
26. **"Whole-market answers, live in the meeting."** Look up any project, price band, or status while the client is in the room. — NOW

## F. Status, trust & exclusivity offers

27. **"The RECO-verified club."** A members-only data room the public can't touch. — NOW
28. **"Carry the verified badge."** Verification status badge on your presence in the product. — NOW
29. **"Built in Canada, for Ontario."** The local alternative to US aggregators, built around Ontario broker practice. — NOW
30. **"Verified in 24 hours."** Concierge verification SLA (admin console makes this a same-day job). — OPS

## G. Founding-member & scarcity mechanics

31. **"Free for life, locked in."** Early verified agents are grandfathered against any future pricing. — NOW (costless today, but it's a real pricing commitment — decide the ceiling first)
32. **"Founding Agent cohort — first 100."** Badge + direct input into the roadmap. — OPS
33. **"First pick of representative slots."** Early joiners claim project-page rep slots before they're gone. — SMALL (pairs with #20; real scarcity: one per page)
34. **"City Founding Agent."** A limited number of featured agents per city. — SMALL
35. **"Founding contributors wall."** Named credit for the agents who seeded the data. — SMALL

## H. Network & referral offers

36. **"Bring your office."** Brokerage-level onboarding; office logo on every member's card. — SMALL (`brokerages` table exists, no CRUD UI)
37. **"Refer a verified colleague."** Manual perk for referrals (badge, rep-slot priority — not cash, not leads). — OPS
38. **"The verified pre-con directory."** Find other verified agents active in pre-con for co-op deals. — SMALL (profiles exist; directory UI doesn't)

## I. Honest future-access offers (use sparingly; no lead promises)

39. **"Priority position when lead routing launches."** Waitlist framing only — explicit "when it ships." Routing schema exists; the feature doesn't. — FUTURE
40. **"Builder-direct early access."** First intros as developers onboard (developer role is stubbed in schema). — FUTURE
41. **"AI listing-copy assistant."** Hinted at by `description_ai_draft`; a future member perk. — FUTURE

---

## Strongest plays (recommendation)

The hero offer should be the thing that is 100% built, differentiated, and zero-marginal-cost:
**deal intelligence (#1–3)**. Then use **off-market/assignments (#14–15)** as the network-effect
engine — every posting makes the platform more valuable and costs us nothing to fulfill — and
**claim-your-page (#20/#33)** as scarcity/urgency.

Composite headline shape:

> **See every commission. Post your off-market inventory. Claim your project page.**
> Free for RECO-verified Ontario agents.

## Guardrails before any of this ships as copy

- **No lead promises anywhere** — matches the code reality (captured, never delivered).
- **RECO**: "verification required" is fine; no implied endorsement (existing footer disclaimer stays).
- **No MLS branding** (existing `brand.ts` guardrail).
- **Off-market/exclusive advertising (TRESA)**: broker-to-broker sharing inside a verified network is
  the right channel, but posting exclusives has seller-consent/advertising rules — get a compliance
  read before launching #14–16. (Not legal advice.)
- **"Free for life" (#31)** is a forever pricing commitment — scope it (e.g., "core broker data free
  for life") before publishing.

# LIQWD Agent Panel — UX Reorg Blueprint

**Status: Phase 1 SHIPPED 2026-09-01 (six-noun rail, label/title alignment, Verification in nav, guide renamed Learn; "Deal room" confirmed by founder). Phase 2 SHIPPED 2026-09-01 (Home = "Needs you" next-best-action stack · setup progress until 100% · three-tile scoreboard · "New homes this week" rail; the permanent onboarding slots and the quick-link card wall are gone). Phase 3 SHIPPED 2026-09-02 (Deal room's three boards → one tabbed "Marketplace" at a stable `/dashboard/marketplace` link; Lead pages + Client hubs → one "pages that send you leads" surface with a shared tab strip; routes unchanged). Phase 4 SHIPPED 2026-09-02 (playbook tier inside Marketing for realtors: `/dashboard/marketing` = the guided plan with step state computed from real data, and `/dashboard/approvals` = the single decision inbox, carrying the rail's ONLY numeric badge; realtors decide on their own items via ownership-checked server actions). Rail is now 5 + 4 + 4 + 4 + 4 = 21 items under six nouns, from 22 under five junk-drawer sections.**
Source: full IA audit of the live agent panel + pattern study of Shopify,
Canva, HubSpot, Stripe, Linear, Follow Up Boss, GoDaddy, QuickBooks, Airbnb
host, Meta Business Suite, Google Business Profile, Luxury Presence, kvCORE
(the cautionary tale). North star per founder: **intuitive**.

---

## Part 1 — What's wrong today (the audit, condensed)

The realtor rail is **22 destinations across 5 sections**. Specific findings:

1. **"Earn" is a junk drawer** — 9 items spanning four unrelated jobs:
   co-broke boards (Off-Market, Assignment Desk — near-duplicates of each
   other), referral income (Quick Wins, Refer & earn), deal negotiation
   (Developer Deals, Buyer Matching, Negotiate Terms), and self-marketing
   (My Public Page, Shortlists). Almost everything in the app earns; "Earn"
   categorizes nothing.
2. **The marketing job has no home** — fragmented across six surfaces (My
   Public Page, Lead Pages, Shortlists, Newsletter, Get free leads, the
   buried per-project /promote). This is exactly the incoming playbook
   suite's territory.
3. **Name collision incoming:** the nav's "Playbook" (/dashboard/learn) is
   an education guide; the playbook *system* is the marketing suite. Rename
   the guide (→ "Learn") before the suite ships.
4. **Label/route/title drift everywhere:** Developer Deals → /deal-desk →
   "Deal Desk"; Buyer Matching → /buyer-mandates → "Buyer mandates";
   Negotiate Terms → /proposals → "My proposals"; Clients → /crm. Two or
   three names per thing.
5. **Jargon:** mandates, RFPs, Lead Pages, CRM, "Quick Wins" (opaque — it
   means rental referrals).
6. **The funnel is split mid-stream:** Leads sits under "New Homes" while
   Clients + Newsletter live in another section. Leads → Clients →
   Newsletter is one story.
7. **Verification — the gate on the whole product — has no nav home**
   (banner-only). Submit project / Update Requests are mis-filed under
   "Account."
8. **Onboarding eats three permanent slots** (Get started, Get free leads,
   Playbook) — week-one content, clutter forever after.
9. **Tier blindness:** a realtor can't tell Free vs Pro vs Ultra before
   clicking — exploration becomes paywall surprise.
10. **Good news:** the sidebar already renders role-specific rails from a
    data structure (`REALTOR_SECTIONS` in
    `src/components/dashboard/sidebar.tsx`) — the regroup is a data edit,
    not a rebuild.

## Part 2 — What the best platforms do (patterns to borrow)

1. **3–5 top-level nouns, jobs not features** (HubSpot, Follow Up Boss,
   QuickBooks, Canva). Recognition beats recall; new features nest under
   stable nouns so the nav never grows. kvCORE shows the failure mode.
2. **Home = next-best-action feed, not an analytics dump** (Shopify,
   GoDaddy, Airbnb host "Today"). 2–4 contextual cards, each one button;
   cards expire when done.
3. **Setup checklist as the onboarding spine, parked in the chrome**
   (Shopify, Stripe, Google Business Profile's strength ring). Persistent
   meter, deep-links to each fix, disappears at 100%. Replaces the three
   permanent onboarding slots.
4. **One decision inbox, one badge** (Linear Inbox, Follow Up Boss, Meta
   Business Suite). Everything needing a human lands in one stream; module
   pages deep-link into it, never host their own approve buttons. Badge
   discipline: numeric badges ONLY on the decision queue.
5. **Job-first creation launcher** (Canva): 53 tools never render as a
   53-item list — one "Create" entry opens an outcome picker ("Market a
   listing", "Post to social") with search.
6. **Done-for-you by default, approval as the only checkpoint** (Luxury
   Presence, Shopify Magic): agents review finished drafts; they never see
   a workflow editor. Compliance runs silently; failures surface as fixes.
7. **Scoreboard with a benchmark, not charts** (GoDaddy InSight): 3 tiles
   max — leads, response time, page views — each with a peer comparison
   ("faster than 70% of LIQWD agents") wired to an action card.
8. **State-gated nav** (HubSpot, Stripe): pending-verification realtors see
   a short rail; sections appear on approval with a "You've unlocked…"
   moment.
9. **Visible-but-locked paid modules with real sample output** (Notion,
   Stripe): locked modules open to the same page, sample rendered with the
   agent's own data, run button swapped for "Unlock with Pro." Never a bare
   padlock. Consider one free taste-run per paid suite whose draft lands in
   Approvals — the upgrade prompt then sits on an asset they already want.
10. **One page anatomy everywhere** (Stripe, Linear): list → detail with the
    same header/tabs/drawer skeleton; learn one module, you've learned all
    53. The Approvals drawer and module-page drawer are the same component.
11. **Progressive catalog disclosure** (Stripe, GBP): current phase's 2–3
    modules prominent; later modules visible-but-dimmed with "unlocks after
    X." A sequenced path reads as a plan; a flat catalog reads as homework.
12. **Search as the escape hatch** (Stripe, Linear): one visible search box
    over projects + modules + approvals keeps the nav honest at ~10 items.

## Part 3 — The proposed IA (6 nouns)

Order and naming follow the three-sided thesis (positioning blueprint,
Part 0): the daily surface and the tools lead; **new homes is one offering
among several and must not be over-stated** — so it is named honestly and
placed fourth, not first.

| # | Noun | Contains | Today's items absorbed |
|---|---|---|---|
| 1 | **Home** | Next-best-action stack · setup ring (until 100%) · 3-tile scoreboard · "Running now" | Get started, Get free leads, activation banners |
| 2 | **Leads & clients** | Leads inbox → contact book → newsletter (one funnel) | Leads, Clients/CRM, Newsletter |
| 3 | **Marketing** | My public page · **Lead pages (source-agnostic: resale, blanket agent leads, any campaign — not a new-homes feature)** · client shortlists · **branded website with IDX/VOW (paid, hosted + managed) when it ships** · the playbook roadmap · per-project Promote surfaced here | My Public Page, Lead Pages, Shortlists, /promote |
| 4 | **Deal room** | One agent marketplace with tabs (Assignments / Off-market / Buyer wants) · Developer deals · My offers · Rental referrals | Off-Market, Assignment Desk, Buyer Matching, Negotiate Terms, Developer Deals, Quick Wins |
| 5 | **New homes** | The pre-construction catalog: browse + portals + submit a project + my update requests | Projects, Broker Portals, Submit project, Update Requests |
| 6 | **Account** | Profile & brand · verification (finally in nav) · plan & upgrade · notifications (the "settings" tab lives here) · Refer & earn | Profile, /verify, /upgrade, Refer & earn |

**Admin parity (founder rule):** admin accounts see the entire realtor rail
plus the Admin section, so the realtor experience is testable from an admin
login. No reduced "realtor mirror" for admins.

Plus: **Learn** (the renamed education guide) demoted to a Home card, and later **one search box** in the header.

**Rules that ride along:** one numeric badge total (the decision inbox);
every item's label = route = page title (fix the drift in the same pass);
tier chips (Free/Pro/Ultra) visible on cards before clicking; empty states
show sample output + one CTA + honest time-to-value.

## Part 4 — Phasing (each shippable alone)

1. **Regroup + rename** (data edit in sidebar.tsx): the 6-noun rail, merge
   labels/routes/titles, Verification into Account, rename Learn. Cheapest,
   biggest felt win.
2. **Home rebuild:** next-best-action cards computed from state, setup ring,
   3-tile scoreboard. Kills the permanent onboarding slots.
3. **Consolidations:** one Deal-room marketplace with tabs; Lead Pages +
   Shortlists → "Client links."
4. **Playbook tier lands inside Marketing** — the roadmap + Approvals inbox
   (already prototyped in admin) slot into a home that finally exists for
   them.

Nothing here weakens gates or RLS; it's presentation and grouping only.

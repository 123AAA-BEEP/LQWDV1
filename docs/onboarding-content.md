# LIQWD Onboarding — content (v1)

> **Status: SHIPPED.** Built as a self-contained wizard at `/dashboard/start`
> (`src/components/dashboard/onboarding/wizard.tsx`), entered from a dismissible
> "Get started" banner on the realtor home + an Account → Get started sidebar
> link.
>
> **Live (NOW) tour paths:** free leads · more lead pages (Pro) · refer an agent
> · **match a tough buyer** (Buyer Matching → `/dashboard/buyer-mandates`) ·
> **negotiate better terms** (→ `/dashboard/proposals`).
> **Gated (Coming soon, content-complete, no CTA):** earn from rentals (needs a
> PBR partner) · **Developer Deals** (Deal Desk — opens when developer deal flow
> is live).

**Style:** TurboTax — *one concept per slide*, plain language for a wide literacy
range, and **lead with the money**, not the concept. Show the outcome first, then
the one or two steps, then a do-it-now button.

> Principle: only promise what's deliverable today. Anything that depends on a
> developer/operator partner is **clearly badged "Coming soon"** so we never
> over-promise to agents.

## What we can deliver NOW vs COMING SOON

| Earn path | Status | Depends on |
|---|---|---|
| **Free buyer leads** — add or update a project, get its leads | ✅ **Now** | — |
| **Get your first review** — verified client reviews on your public page | ✅ **Now** | — |
| **More lead pages** — Pro unlocks up to 10 | ✅ **Now** | Pro upgrade |
| **Refer an agent → free Pro** | ✅ **Now** | — |
| **Find opportunities & broker portals** (data/research) | ✅ **Now** *(tool, not direct $)* | — |
| **Rental referral income** (Quick Wins) | ⏳ **Coming soon** | a purpose-built-rental partner |
| **Deal Desk · Buyer Matching · Negotiate Terms** | ❓ **To classify** | active developers on platform |

> Open question: the three developer-dependent paths (Deal Desk, Buyer Matching,
> Negotiate Terms) are *built* but only pay off once developers are active —
> same situation as rentals. Decide per path: show **Now** or badge **Coming
> soon** until developer supply exists. v1 below ships the confirmed-Now paths +
> the Coming-soon rentals.

---

## The flow

### 0 · Welcome (hook — money first)
> **Get paid for the work you already do.**
> A few simple ways to earn on LIQWD. Pick one and we'll show you how — 2 minutes.
[ Show me how → ]

### 1 · Picker — "How do you want to earn?"
Big visual tiles (Now first; Coming-soon clearly badged):
- 💸 **Get free leads** — Now
- 📄 **Run more lead pages** — Now
- 🎁 **Refer an agent** — Now
- 🏢 **Earn from rentals** — *Coming soon*

---

### Path A · Get free leads — ✅ NOW
- **Slide 1 (outcome):** *Get buyer leads — for free.* When a buyer asks about a
  project you added or updated, that lead comes straight to you.
- **Slide 2 (step 1):** *Add or update a project.* Submit a new one, or send an
  update on any project already on LIQWD.
- **Slide 3 (step 2):** *You become the agent on its page.* Once it's live,
  buyer enquiries route to you — no cost.
- **Slide 4 (do it now):** *Add your first project.* → `/dashboard/submit`

### Path B · Run more lead pages — ✅ NOW (Pro)
- **Slide 1 (outcome):** *Capture more leads with your own project pages.* Pro
  unlocks up to 10 lead-generating landing pages.
- **Slide 2 (reassure):** *Your free plan stays free.* Upgrade only when you want
  more reach.
- **Slide 3 (do it now):** *See what Pro includes.* → `/dashboard/upgrade`

### Path C · Refer an agent → free Pro — ✅ NOW
- **Slide 1 (outcome):** *Invite an agent — you both get Pro free.*
- **Slide 2 (do it now):** *Grab your invite link.* → `/dashboard/refer`

### Path D · Earn from rentals — ⏳ COMING SOON
- **Slide 1 (outcome):** *Get paid to refer renters.* Refer a client to a
  purpose-built rental; the building's leasing team does the rest; you get paid
  when they sign.
- **Slide 2 (why it's easy):** *Low effort, fast payout.* No showings, no
  paperwork — just route a qualified renter, between your bigger deals.
- **Slide 3 (the gate):** **Coming soon.** We're signing up rental partners now.
  *We'll let you know the moment it's live.* [ Notify me ]  *(no further action)*

---

## "Data / find opportunities" (NOW — supporting value, not a hard $ promise)
Surfaced as a closing card, not an earn tile:
> **Everything in one place.** Browse active projects and every broker portal you
> can access — so you spot the right opportunity faster. → `/dashboard/projects`

---

## Build notes (for the follow-up)
- Format: a custom guided modal/route (one concept per slide) — buildable with
  `react-joyride`/`Shepherd.js` for in-context tooltips, or a self-contained
  `/dashboard/start` wizard. No third-party SaaS needed.
- Pair with a persistent **"Get started" checklist** (progress meter) anchored to
  Path A (add/update a project).
- Reuse the color-coded zones (emerald Earn, etc.) so the walkthrough matches the
  product.
- Coming-soon paths render content but **dead-end at the gate** (no broken CTAs).

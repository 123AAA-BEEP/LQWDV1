# LIQWD — Roadmap & Idea Backlog

Captured product ideas that are **not yet scheduled to build**. Each item
records intent and open questions so we can pick it up cleanly later.

---

## 🔒 Ultra Tier (realtor dashboard) — FLAGGED, build later

> **Status:** Idea captured `2026-06-16`. Do **not** build yet.
> **Revisit trigger:** Flag this for active work once we get closer to
> deploying the developer-side portions of the project. Surface it then.

### Concept
A premium "Ultra Tier" for verified realtors, promoted from within the
dashboard with an aspirational, gamified unlock path.

### UI surface (dashboard)
- **Attractive teaser banner / caret** — something like *"Join the Ultra
  Tier"* with a **lock icon** overlay, designed to feel desirable rather
  than restrictive.
- **Small "learn more" affordance** — a little **eye icon** that opens an
  explainer of *how to unlock* the tier.
- **Step-by-step milestone tracker** — a progress stepper showing the
  milestones / actions a realtor must complete to unlock Ultra ("hit this
  milestone, do that…"). Should read as a checklist of achievable steps.

### Still to define (open questions)
- **What the Ultra Tier actually is** — concrete benefits / features that
  justify the tier. (Not yet decided.)
- **Unlock milestones** — the specific criteria (e.g. activity, submissions,
  verification longevity, engagement metrics). (Not yet decided.)
- Whether tier state is stored on the profile/DB and gated via RLS, mirroring
  the existing verification gating model.

### Where it likely fits (current codebase anchors)
- Dashboard home: `src/app/dashboard/page.tsx` (where the teaser/caret would live).
- Locked-state pattern to mirror: `src/components/dashboard/locked.tsx`
  (`VerificationRequired`) — Ultra would follow a similar "unlock me" UX.
- Gating helpers to extend: `src/lib/auth.ts` (`isApproved`, role/verification helpers).
- UI primitives: `src/components/ui/` (card, button) and `src/components/dashboard/`.
- If persisted: new tier field on the profile + Supabase RLS in `supabase/`.

### Notes
- Tone: aspirational and rewarding, not paywall-y.
- Keep consistent with approved marketing copy in `src/lib/brand.ts`.

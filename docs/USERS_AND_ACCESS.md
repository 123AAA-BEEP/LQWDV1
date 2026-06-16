# LIQWD — Users, Access & Lead Routing

> Architecture framing note. This records *decisions about how the three user
> groups relate, who pays, who owns project data, and how leads flow* — so that
> future build work doesn't quietly re-decide them. It is not an implementation
> spec; where it implies schema, treat that as direction, not a finished design.

## The three user groups

LIQWD serves three distinct audiences. They are modeled as separate concerns,
not variations of one role.

| Group | Status today | Role in the business | Access level |
|-------|--------------|----------------------|--------------|
| **Realtors** | Live | Verified core users. The relationship LIQWD protects and provides value to. | **Deep** — broker-only project data (commissions, broker portals, restricted incentives/documents) behind RLS, gated by `verification_status = 'approved'`. |
| **Public** | Live | Drives **lead generation**, which is the value LIQWD delivers back to realtors. | **Shallow** — reads only the public-safe views (`public_projects_view`, `public_realtor_cards`) and `is_public`/`is_active`-gated rows. Never the raw private tables. |
| **Developers** | Future (build shortly) | The **paying customer**. Real estate developers whose projects are listed. | TBD — will own their own projects and control developer-facing data and routing once built. |

## Principle 1 — Access and billing are separate axes

`role` (realtor / public / developer / admin) governs **access**. It must **not**
double as "is a paying customer."

When developers come online as the paying side, billing attaches to an
**account / organization + entitlement** concept, kept orthogonal to `role`.
This avoids the retrofit where a paying brokerage, a free-tier developer, or any
"pays but also has a role" case fights the role enum.

## Principle 2 — Developer supersedes (project provenance)

Today, projects enter via **realtor submission** → **admin review queue** →
publish. Admin / realtor-submitted data is authoritative *for now*.

When a developer claims and publishes their own project, **the developer's
version becomes authoritative** over realtor-submitted data. This requires
projects to carry explicit **provenance / ownership** so the system knows which
source wins. "Developer supersedes" is the settled rule.

Rollout ordering this implies: a project's authority moves over time —
**admin/realtor-submitted → developer-owned** — as each group comes online.

## Principle 3 — Lead routing is admin-controlled (v1)

A project with a public-facing page generates leads. **Admin is the routing
authority.** Admin assigns, per project, where that project's leads are routed.

### The three destination pathways

1. **Internal / admin** — held by LIQWD.
2. **Realtor(s)** — handed to the realtor(s) admin designates.
3. **Developer's preferred contact** — an internal sales team or any contact the
   developer chooses. *(Future: active once developers are live.)*

### Rules

- **Admin owns routing**, fully, in v1. Admin sets each project's lead
  destination(s).
- **Default route: admin → realtors.** Until admin assigns, admin holds the
  leads; admin then routes to the designated realtor(s).
- **Destinations are one-or-many (fan-out), not a single choice.** A project's
  leads can route to multiple destinations (e.g. a developer's sales team **and**
  the listing realtor). Modeled as a set, not an enum, so adding a destination
  is configuration, not a schema change.
- **LIQWD always retains every lead record.** Routing moves the *notification /
  hand-off* — never the *ownership of the data*. Even when a lead is routed to a
  developer's external sales team, admin retains the full record. This preserves
  the lead analytics that make the developer want to pay in the first place.

### How the developer side layers on later

Developer-controlled routing sits **on top of** the admin model. When a developer
claims a project (and supersedes its data), they may be **granted** routing
control for that project, with **admin remaining the backstop**.

Consequence: v1 only builds **one** routing concept — *admin sets a project's
lead destination(s)*. The developer side later becomes "who is allowed to edit
that setting." No rework of the routing model itself.

## Summary of settled decisions

- Three groups: realtors (verified, deep access), public (lead gen, shallow
  access), developers (future paying customer, own their projects).
- Access (`role`) and billing (account/entitlement) are **separate axes**.
- **Developer supersedes** — projects need explicit provenance/ownership.
- Lead routing is **admin-controlled in v1**, default **admin → realtors**.
- Routing supports **multiple destinations** (admin / realtor(s) / developer's
  contact).
- **LIQWD always retains the lead record**; routing only moves notification.
- Developer-controlled routing is a **later layer** over the admin model — no
  rework required.

# LIQWD — Supabase Backend

Backend source of truth: `liqwd_supabase_schema_prompt_v2.md`.

This folder contains the database schema, row-level security (RLS), storage
buckets/policies, and optional smoke-test seed data for LIQWD — the broker
portal for new homes in Ontario.

```
supabase/
├── migrations/
│   ├── 0001_structural.sql     # tables, constraints, indexes, triggers, public views
│   ├── 0002_rls_policies.sql   # helper functions, escalation guard, RLS + policies
│   ├── 0003_storage.sql        # storage buckets + storage.objects policies
│   ├── 0004_restrict_project_provenance.sql  # admin-only import/source fields + broker view
│   ├── 0005_seo_prompt_settings.sql  # SEO prompt settings
│   ├── 0006_deal_proposals.sql # worksheet proposals table, RLS (Deal Desk, Phase 1)
│   └── 0007_deal_rfps.sql      # ultra tier + RFP tables + confidential RLS (Phase 1)
└── seed.sql                    # optional, idempotent smoke-test fixtures
```

All scripts are **idempotent** — safe to re-run without errors or data loss
(`IF NOT EXISTS`, `CREATE OR REPLACE`, guarded policy/trigger recreation,
`ON CONFLICT DO NOTHING`).

---

## 1. Run order (Supabase SQL Editor)

Run each file as its own query, in this exact order:

| # | File | What it does |
|---|------|--------------|
| 1 | `migrations/0001_structural.sql` | Creates all tables, check constraints, FKs, unique constraints, indexes, the shared `updated_at` trigger, and the two public-safe **definer** views: `public_projects_view` and `public_realtor_cards`. |
| 2 | `migrations/0002_rls_policies.sql` | Adds helper functions (`is_admin`, `is_approved`, `has_project_access`, `safe_uuid`), the profile escalation-guard trigger, enables RLS on every table, sets base grants, and creates all access policies. |
| 3 | `migrations/0003_storage.sql` | Creates the `avatars`, `logos`, `project-media`, and `project-documents` buckets and their `storage.objects` access policies. |
| 4 | `migrations/0004_restrict_project_provenance.sql` | Locks the private import/source-provenance fields on `projects` (`external_source`, `external_source_url`, `import_notes`, `builder_names_raw`, `description_ai_draft`) to **admins only**: base-table SELECT becomes admin-only and a new broker-safe definer view, `broker_projects_view`, exposes every other column to approved realtors. **Ship this with the app code that reads `broker_projects_view`** — once base SELECT is admin-only, any realtor page still querying `projects` directly returns no rows. |
| 5 | `migrations/0005_seo_prompt_settings.sql` | SEO prompt settings. |
| 6 | `migrations/0006_deal_proposals.sql` | Creates `project_proposals` (realtor-initiated worksheet/freeform counter-offers), its indexes, `updated_at` trigger, RLS policies, and grants. See `docs/monetization-deal-desk.md`. |
| 7 | `migrations/0007_deal_rfps.sql` | Adds `profiles.realtor_tier` (admin-controlled ultra gate), `deal_rfps` / `deal_rfp_invitations` / `deal_rfp_proposals`, the `is_ultra` / `is_invited_to_rfp` / `can_respond_to_rfp` helpers, and confidential RLS. See `docs/monetization-deal-desk.md`. |
| … | `migrations/0008_*` … `0018_*` | Deal-desk field hiding, pro plan, buyer mandates + marketplace, mandate connect, ultra paid tier, developer RFPs, mandate checklist, RECO certificate verification, RFP identity reveal, service-role grants. |
| 19 | `migrations/0019_referrals_rewards.sql` | Growth/data-quality reward system: `referral_code` / `referred_by_profile_id` / `pro_until` on `profiles`, `assigned_realtor_until` on `public_project_pages`, the `referrals` and `rewards_ledger` tables (idempotent grants), the `gen_referral_code()` helper, and their RLS. |
| 20 | `migrations/0020_pro_until_entitlement.sql` | Extends `is_pro()` so reward time (`pro_until`) unlocks Pro alongside the paid `plan`, and adds `pro_until` to the self-escalation guard so realtors can't self-grant it. |
| 21 | `seed.sql` *(optional)* | Inserts one brokerage, one approved realtor (+ its `auth.users` row), one published project with an active public page, public media, private rows (commercials, broker portal, incentive, floorplan, restricted document), and a sample lead — enough to smoke-test the public view and the RLS boundary. |

> The SQL Editor runs as a superuser, so it bypasses RLS — migrations and seed
> data apply cleanly.

### Public / private boundary (enforced by these scripts)

- Public reads happen **only** through `public_projects_view`, `public_realtor_cards`,
  and the `is_public` / `is_active`-gated rows of `project_media` and
  `public_project_pages`.
- Raw private tables (commercials, broker portals, restricted incentives/documents,
  internal notes, import/source metadata) are never public.
- Import/source provenance on `projects` (`external_source`, `external_source_url`,
  `import_notes`, `builder_names_raw`, `description_ai_draft`) is **admin-only** —
  not exposed to the public *or* to approved realtors. Realtors read projects
  through `broker_projects_view`, which omits these columns.
- Broker-only data requires an **approved** realtor.
- Developer document access is **grant-based and uploader-scoped**.
- Review queues and `audit_logs` are **admin-only**.

---

## 2. One-time admin bootstrap

This is intentionally **not** in `seed.sql`. With RLS live, no one can self-promote
to `admin` (the guard trigger blocks changes to `role` / `verification_status`).

Run this **once**, in the SQL Editor, **after** the admin has signed up through
the app (which creates their `auth.users` + `profiles` row):

```sql
update public.profiles
   set role = 'admin', verification_status = 'approved'
 where email = 'alexkarczewski91@gmail.com';
```

Verify:

```sql
select id, email, role, verification_status
  from public.profiles
 where email = 'alexkarczewski91@gmail.com';
```

The SQL Editor runs as superuser, so it bypasses the escalation guard.

---

## 3. Required manual dashboard actions (after the SQL)

The scripts cover schema, RLS, and bucket definitions. These remain dashboard-side:

- **Auth → URL Configuration:** set the Site URL and Redirect URLs for login,
  signup, password reset, and email-change callbacks.
- **Auth → Providers:** confirm the **Email** provider is enabled and choose your
  email-confirmation setting.
- **Auth → Email Templates:** point reset/confirm templates at your app routes if
  customized.
- **Create the real admin user:** sign up `alexkarczewski91@gmail.com` via the
  app/dashboard, then run the bootstrap SQL in section 2.
- **Storage (verify):** confirm `avatars`, `logos`, `project-media`, and
  `project-documents` exist, and that **`project-documents` is private**.
- **Advisor / linter notice (expected):** `public_projects_view`,
  `public_realtor_cards`, and `broker_projects_view` will be flagged as
  "security definer view." This is **intentional** — they are the controlled
  access gateways (the first two public, the third broker-only) that self-gate
  via their `WHERE` clause — so those warnings can be dismissed.

### Storage path conventions (required by the storage policies)

```
avatars/{user_id}/<file>
logos/{user_id}/<file>
project-media/{project_id}/<file>        # admin-managed
project-documents/{project_id}/<file>    # first folder must be the project UUID
```

---

## 4. Environment variables

Set these in the app and deployment environment (names per the LIQWD env handoff):

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client) | e.g. `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client) | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Never exposed to the browser |

- Build the frontend with `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Use `SUPABASE_SERVICE_ROLE_KEY` only for secure server-side operations.

---

## ⚠️ Secret handling

- **Never** put the `SUPABASE_SERVICE_ROLE_KEY` (or any secret) in client-side
  code, `NEXT_PUBLIC_*` variables, this repo, or shared markdown docs.
- The service role key **bypasses RLS** — treat it like a root credential and keep
  it server-side only.
- Only the public (`anon`) key may be used in the browser. Rotate keys in the
  Supabase dashboard if one is ever exposed.

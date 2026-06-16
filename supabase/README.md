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
│   └── 0004_advertiser_similar_properties.sql  # advertiser flag + similar-properties controls
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
| 4 | `migrations/0004_advertiser_similar_properties.sql` | Adds `projects.is_advertiser` + `projects.show_similar_override`, and surfaces them (plus the derived `show_similar_block`) through `public_projects_view`. Powers the public page's "similar / competing properties" module: suppressed for paying advertisers, shown on free listings (advertisers ranked first). |
| 5 | `seed.sql` *(optional)* | Inserts one brokerage, one approved realtor (+ its `auth.users` row), one published project with an active public page, public media, private rows (commercials, broker portal, incentive, floorplan, restricted document), and a sample lead — enough to smoke-test the public view and the RLS boundary. |

> The SQL Editor runs as a superuser, so it bypasses RLS — migrations and seed
> data apply cleanly.

### Public / private boundary (enforced by these scripts)

- Public reads happen **only** through `public_projects_view`, `public_realtor_cards`,
  and the `is_public` / `is_active`-gated rows of `project_media` and
  `public_project_pages`.
- Raw private tables (commercials, broker portals, restricted incentives/documents,
  internal notes, import/source metadata) are never public.
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
- **Advisor / linter notice (expected):** `public_projects_view` and
  `public_realtor_cards` will be flagged as "security definer view." This is
  **intentional** — they are the controlled public gateways — so those two
  warnings can be dismissed.

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

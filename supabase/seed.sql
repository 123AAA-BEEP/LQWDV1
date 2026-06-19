-- =============================================================================
-- LIQWD — seed.sql (smoke-test fixtures)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Inserts a minimal, coherent set of fixtures to smoke-test the public view,
--   the realtor-card view, and the public/private RLS boundary end to end:
--     1 brokerage, 1 approved realtor profile (+ its auth.users row),
--     1 published project with an active public page, 1 public media row,
--     plus PRIVATE rows (commercials, broker portal, incentive, floorplan,
--     restricted document) and 1 sample lead.
--
-- EXECUTION ORDER
--   Run LAST, after 0001 -> 0002 -> 0003. (Run as the SQL Editor superuser,
--   which bypasses RLS so the fixtures insert cleanly.)
--
-- PREREQUISITES
--   All three migrations applied. pgcrypto (from 0001) provides crypt()/gen_salt().
--
-- SAFE TO RE-RUN?
--   Yes. Deterministic UUIDs + ON CONFLICT DO NOTHING / NOT EXISTS guards make
--   this idempotent.
--
-- NOTES
--   - The auth.users row is the bare minimum to satisfy profiles.id ->
--     auth.users(id). For a REAL password login as this realtor, create the
--     user via the Auth dashboard instead.
--   - First-admin bootstrap is NOT in this file (by design). See project README.
--
-- Fixed IDs:
--   realtor user  : 11111111-1111-1111-1111-111111111111
--   brokerage     : 22222222-2222-2222-2222-222222222222
--   project       : 33333333-3333-3333-3333-333333333333
--   public page   : 44444444-4444-4444-4444-444444444444
--   media         : 55555555-5555-5555-5555-555555555555
--   rental project: 66666666-6666-6666-6666-666666666666
--   worksheet     : 88888888-8888-8888-8888-888888888888
--   submission    : 99999999-9999-9999-9999-999999999999
--   suggestion    : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- =============================================================================

-- 0. Auth user (FK target for profiles) --------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'seed.realtor@liqwd.test',
  crypt('Password123!', gen_salt('bf')), now(),
  now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, '', '', '', ''
)
on conflict (id) do nothing;

-- 1. Brokerage ---------------------------------------------------------------
insert into public.brokerages (id, brokerage_name, brokerage_slug, province, city, is_verified)
values (
  '22222222-2222-2222-2222-222222222222',
  'Skyline Realty Group', 'skyline-realty-group', 'Ontario', 'Mississauga', true
)
on conflict (id) do nothing;

-- 2. Approved realtor profile ------------------------------------------------
insert into public.profiles (
  id, role, first_name, last_name, title, email, phone,
  brokerage_id, brokerage_name, reco_registration_number,
  verification_status, is_public_profile_enabled
)
values (
  '11111111-1111-1111-1111-111111111111',
  'realtor', 'Jordan', 'Avery', 'sales_representative',
  'seed.realtor@liqwd.test', '+1-905-555-0142',
  '22222222-2222-2222-2222-222222222222', 'Skyline Realty Group', 'RECO-1234567',
  'approved', true
)
on conflict (id) do nothing;

-- 3. Project (published + public page enabled) -------------------------------
insert into public.projects (
  id, slug, project_name, headline,
  description_short, description_long,
  construction_status, sales_status, ownership_type,
  builder_name, builder_names_raw,
  address_full, city, municipality, province, postal_code, neighbourhood,
  occupancy_estimate_text, total_units, storeys,
  bedrooms_summary, size_range_sqft_min, size_range_sqft_max,
  price_from_public, price_to_public, price_currency,
  hero_image_url,
  public_page_enabled, record_status,
  external_source, import_notes, published_at
)
values (
  '33333333-3333-3333-3333-333333333333',
  'the-carter-residences', 'The Carter Residences',
  'Boutique condos in the heart of Mississauga',
  'A 24-storey boutique condominium with transit at the door.',
  'The Carter Residences brings refined living to central Mississauga with curated amenities, smart layouts, and direct transit access.',
  'preconstruction', 'selling', 'condo',
  'Carter Development Corp', 'CARTER DEV CORP (raw import string — private)',
  '100 City Centre Dr, Mississauga, ON', 'Mississauga', 'Mississauga', 'Ontario', 'L5B 2C9', 'City Centre',
  'Q4 2027', 312, 24,
  '1–3 Bed', 485, 1180,
  599000, 1250000, 'CAD',
  'https://placehold.co/1200x800/png?text=The+Carter+Residences',
  true, 'published',
  'internal_provider_x', 'Seeded for smoke test — private import note.', now()
)
on conflict (id) do nothing;

-- 4. Public project page (active + indexable) --------------------------------
insert into public.public_project_pages (
  id, project_id, slug, is_active, indexable,
  page_title, page_summary, page_description,
  seo_title, seo_meta_description, canonical_url,
  custom_cta_text, assigned_realtor_profile_id, lead_routing_mode, published_at
)
values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'the-carter-residences', true, true,
  'The Carter Residences — Mississauga New Condos',
  'Boutique condos with transit at the door in central Mississauga.',
  'Explore floorplans, pricing bands, and occupancy for The Carter Residences in Mississauga.',
  'The Carter Residences | New Condos in Mississauga',
  'Boutique pre-construction condos in central Mississauga. Pricing from the high $500s. Q4 2027 occupancy.',
  'https://liqwd.example.com/projects/the-carter-residences',
  'Request information', '11111111-1111-1111-1111-111111111111', 'assigned_realtor', now()
)
on conflict (id) do nothing;

-- 5. Public media row --------------------------------------------------------
insert into public.project_media (
  id, project_id, media_type, url, alt_text, caption, sort_order, is_public
)
values (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'hero', 'https://placehold.co/1200x800/png?text=Carter+Hero',
  'Exterior rendering of The Carter Residences', 'Architectural rendering', 0, true
)
on conflict (id) do nothing;

-- 6. PRIVATE rows — must NOT surface in public_projects_view ------------------
-- 6a. Private commercials (commission / negotiability)
insert into public.project_private_commercials (
  project_id, commission_summary, commission_percent,
  commission_is_negotiable, price_is_negotiable, incentives_are_negotiable,
  negotiability_notes, private_incentive_notes, internal_pricing_notes
)
select
  '33333333-3333-3333-3333-333333333333',
  '4.0% + HST on first $100k, 2.0% on balance', 4.00,
  true, false, true,
  'Commission negotiable on bulk deals.', 'Capped levies worth ~$12,000 (private).',
  'Floor 18+ carries a $25k premium (internal).'
where not exists (
  select 1 from public.project_private_commercials
  where project_id = '33333333-3333-3333-3333-333333333333'
);

-- 6b. Broker portal (realtor-only)
insert into public.project_broker_portals (
  project_id, portal_name, portal_type, url, is_primary, is_active, added_by_user_id
)
select
  '33333333-3333-3333-3333-333333333333',
  'Carter Broker Portal', 'external_url', 'https://portal.example.com/carter',
  true, true, '11111111-1111-1111-1111-111111111111'
where not exists (
  select 1 from public.project_broker_portals
  where project_id = '33333333-3333-3333-3333-333333333333'
);

-- 6c. Incentive (public + private description)
insert into public.project_incentives (
  project_id, title, description_public, description_private, is_active, is_negotiable
)
select
  '33333333-3333-3333-3333-333333333333',
  'Capped Development Levies',
  'Development charges are capped for a limited time.',
  'Cap set at $12,000; internal ceiling $15,000.', true, true
where not exists (
  select 1 from public.project_incentives
  where project_id = '33333333-3333-3333-3333-333333333333'
    and title = 'Capped Development Levies'
);

-- 6d. Floorplan (carries internal pricing → realtor-only)
insert into public.project_floorplans (
  project_id, plan_name, unit_type, beds, baths,
  sqft_interior, price_public, price_internal, availability_status
)
select
  '33333333-3333-3333-3333-333333333333',
  'The Birch', '1 Bed + Den', 1, 1, 612, 619000, 605000, 'available'
where not exists (
  select 1 from public.project_floorplans
  where project_id = '33333333-3333-3333-3333-333333333333'
    and plan_name = 'The Birch'
);

-- 6e. Restricted document (uploaded_by = seed realtor)
insert into public.project_documents (
  project_id, document_type, title, file_url, is_public, source_type, uploaded_by_user_id
)
select
  '33333333-3333-3333-3333-333333333333',
  'brochure', 'Carter Residences Brochure',
  'project-documents/33333333-3333-3333-3333-333333333333/brochure.pdf',
  false, 'upload', '11111111-1111-1111-1111-111111111111'
where not exists (
  select 1 from public.project_documents
  where project_id = '33333333-3333-3333-3333-333333333333'
    and title = 'Carter Residences Brochure'
);

-- 7. Sample lead (public capture path) ---------------------------------------
insert into public.project_leads (
  project_id, public_project_page_id, assigned_realtor_profile_id,
  lead_name, lead_email, lead_phone, is_realtor, message, source_url, status
)
select
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'Sam Buyer', 'sam.buyer@example.com', '+1-416-555-0199', false,
  'Interested in 2-bed units and occupancy timing.',
  'https://liqwd.example.com/projects/the-carter-residences', 'new'
where not exists (
  select 1 from public.project_leads
  where project_id = '33333333-3333-3333-3333-333333333333'
    and lead_email = 'sam.buyer@example.com'
);

-- 8. Purpose-built rental + worksheet fixtures (migrations 0004/0005) ---------
-- 8a. A published FOR-RENT project (monthly pricing) that accepts referrals.
insert into public.projects (
  id, slug, project_name, headline, description_short,
  construction_status, sales_status, ownership_type,
  listing_type, price_period,
  builder_name,
  address_full, city, municipality, province, postal_code, neighbourhood,
  occupancy_estimate_text, total_units, storeys,
  bedrooms_summary, size_range_sqft_min, size_range_sqft_max,
  price_from_public, price_to_public, price_currency,
  hero_image_url, public_page_enabled, record_status,
  external_source, published_at
)
values (
  '66666666-6666-6666-6666-666666666666',
  'the-maple-rental-residences', 'The Maple Rental Residences',
  'Purpose-built rental in midtown Toronto',
  'A professionally managed purpose-built rental community with concierge and amenities.',
  'completed', 'completed', 'rental',
  'for_rent', 'monthly',
  'Maplewood Living',
  '200 Eglinton Ave E, Toronto, ON', 'Toronto', 'Toronto', 'Ontario', 'M4P 1A6', 'Midtown',
  'Move-in ready', 280, 32,
  'Studio–3 Bed', 410, 1150,
  2200, 4800, 'CAD',
  'https://placehold.co/1200x800/png?text=The+Maple+Rental', false, 'published',
  'internal_provider_x', now()
)
on conflict (id) do nothing;

-- 8b. Referral terms (1:1 with the rental project) — self-serve, 1 month rent.
insert into public.project_referral_terms (
  project_id, accepts_referrals,
  referral_fee_type, referral_fee_value, referral_fee_notes, payout_terms,
  min_lease_term_months, min_household_income, min_credit_band, pets_allowed,
  service_mode, is_active
)
select
  '66666666-6666-6666-6666-666666666666', true,
  'months_rent', 1.0,
  'One month''s rent on a completed lease, paid to the agent''s brokerage.',
  'Invoiced by the agent''s brokerage 30 days after lease commencement.',
  12, 60000, 'good', true,
  'self_serve', true
where not exists (
  select 1 from public.project_referral_terms
  where project_id = '66666666-6666-6666-6666-666666666666'
);

-- 8c. A reusable rental worksheet owned by the seed realtor (meets the terms).
insert into public.worksheets (
  id, owner_profile_id, worksheet_type, label,
  client_first_name, client_last_name, client_email, client_phone,
  desired_beds_min, desired_beds_max, parking_required, desired_move_in_date,
  rent_budget_min, rent_budget_max, annual_household_income, credit_band,
  lease_term_months, num_occupants, has_pets, status
)
values (
  '88888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111', 'rental', 'Taylor R. — 2BR midtown',
  'Taylor', 'Rivera', 'taylor.rivera@example.com', '+1-416-555-0123',
  2, 2, true, '2026-08-01',
  3000, 4200, 95000, 'excellent',
  12, 2, false, 'active'
)
on conflict (id) do nothing;

-- 8d. A submission of that worksheet to the rental project (referral, matched).
--     snapshot carries the client contact (full contact on submission).
insert into public.worksheet_submissions (
  id, worksheet_id, project_id, submitted_by_profile_id, submitting_brokerage_id,
  submission_kind, snapshot, matched_terms, referral_fee_quoted, status
)
values (
  '99999999-9999-9999-9999-999999999999',
  '88888888-8888-8888-8888-888888888888',
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'rental_referral',
  '{"client_first_name":"Taylor","client_last_name":"Rivera","client_email":"taylor.rivera@example.com","client_phone":"+1-416-555-0123"}'::jsonb,
  true, '1 month rent', 'submitted'
)
on conflict (id) do nothing;

-- 8e. A platform suggestion ("Got an idea?") from the seed realtor.
insert into public.platform_suggestions (
  id, submitted_by_profile_id, category, title, body,
  open_to_collaborate, contact_ok, status
)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'feature_request',
  'Saved-search alerts for new rental referral opportunities',
  'Notify me when a new PBR building starts accepting referrals in my service area.',
  true, true, 'new'
)
on conflict (id) do nothing;

-- =============================================================================
-- VERIFY (optional) — paste these in the SQL editor after seeding.
--
-- A) Public surfaces return the project, never private fields:
--      select * from public.public_projects_view;        -- 1 row, public-safe only
--      select * from public.public_realtor_cards;        -- 1 row: Jordan Avery / Skyline
--
-- B) Test RLS by impersonating roles in the SQL editor:
--    -- anon: should see the view but NOT raw projects
--      set local role anon;
--      select count(*) from public.public_projects_view;  -- expect 1
--      select count(*) from public.projects;              -- expect 0 (RLS blocks)
--      reset role;
--
--    -- approved realtor: should see projects + broker-only tables
--      set local role authenticated;
--      set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
--      select count(*) from public.projects;                       -- expect 1
--      select count(*) from public.project_private_commercials;    -- expect 1
--      select count(*) from public.project_broker_portals;         -- expect 1
--      reset role;
--      reset request.jwt.claims;
--
-- C) Worksheets / referrals:
--      -- the worksheet meets the rental project's accepted parameters:
--      select public.worksheet_matches_referral_terms(
--        '88888888-8888-8888-8888-888888888888',
--        '66666666-6666-6666-6666-666666666666');           -- expect true
--      -- the rental project shows up in the broker-only referral feed:
--      select project_name, referral_fee_type, referral_fee_value
--        from public.referral_opportunities_view;            -- expect The Maple Rental Residences
-- =============================================================================

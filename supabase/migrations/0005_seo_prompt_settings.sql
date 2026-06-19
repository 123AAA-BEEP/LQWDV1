-- =============================================================================
-- LIQWD — Migration 0005: AI SEO prompt settings
-- -----------------------------------------------------------------------------
-- A single-row, admin-editable table of instructions that steer the AI SEO
-- generator (per field + an overall house-style note). Read at generation time
-- (manual button and auto-on-publish), so changes apply to all future
-- generations indefinitely. Admin-only via RLS.
--
-- SAFE TO RE-RUN? Yes — table/policy are guarded, seed row uses ON CONFLICT.
-- =============================================================================

create table if not exists public.seo_prompt_settings (
  id                                smallint primary key default 1,
  overall_instructions              text,
  seo_title_instructions            text,
  seo_meta_description_instructions text,
  page_summary_instructions         text,
  page_description_instructions     text,
  updated_at                        timestamptz not null default now(),
  updated_by                        uuid references public.profiles (id) on delete set null,
  constraint seo_prompt_settings_singleton check (id = 1)
);

insert into public.seo_prompt_settings (id) values (1) on conflict (id) do nothing;

alter table public.seo_prompt_settings enable row level security;

drop policy if exists seo_settings_admin_all on public.seo_prompt_settings;
create policy seo_settings_admin_all on public.seo_prompt_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- End of migration 0005.
-- =============================================================================

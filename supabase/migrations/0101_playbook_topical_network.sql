-- =============================================================================
-- LIQWD — Migration 0101: Playbook System — topical network + content grades
-- (migrations-spec 0003, founder-approved 2026-09-01)
-- -----------------------------------------------------------------------------
-- The stateful content map: nodes with a metadata-before-generation gate and
-- an overlap gate, edges for cannibalization tracking, grade history, and the
-- articles.topic_node_id stamp both engines will set going forward.
-- =============================================================================

create table if not exists public.topic_nodes (
  id uuid primary key default gen_random_uuid(),
  property text not null,
  slug text not null,
  title text not null,
  kind text not null check (kind in
    ('pillar', 'cluster', 'neighbourhood', 'project', 'buyer_question', 'market_theme')),
  parent_id uuid references public.topic_nodes(id),
  keywords text[] not null default '{}' check (coalesce(array_length(keywords, 1), 0) <= 3),
  category text,
  description text,
  state text not null default 'pending' check (state in
    ('pending', 'metadata_complete', 'queued', 'generating', 'complete', 'failed')),
  authority_ceiling numeric,
  article_id uuid,
  relevance_rank int,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property, slug)
);
create index if not exists topic_nodes_state_idx on public.topic_nodes(property, state);

create table if not exists public.topic_edges (
  source_id uuid not null references public.topic_nodes(id) on delete cascade,
  target_id uuid not null references public.topic_nodes(id) on delete cascade,
  kind text not null check (kind in ('supports', 'compares', 'cannibalization_risk')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (source_id, target_id, kind)
);

-- Gates: metadata before generation; unresolved cannibalization blocks queueing.
create or replace function public.topic_nodes_gate()
returns trigger language plpgsql as $$
begin
  if new.state in ('queued', 'generating') then
    if coalesce(array_length(new.keywords, 1), 0) = 0
       or new.category is null or length(trim(coalesce(new.category, ''))) = 0
       or new.description is null or length(trim(coalesce(new.description, ''))) = 0 then
      raise exception 'topic_nodes: metadata (keywords, category, description) must be complete before %', new.state;
    end if;
    if exists (
      select 1 from public.topic_edges e
      where e.kind = 'cannibalization_risk' and e.resolved_at is null
        and (e.source_id = new.id or e.target_id = new.id)
    ) then
      raise exception 'topic_nodes: unresolved cannibalization_risk edge — resolve before queueing';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists topic_nodes_gate_trg on public.topic_nodes;
create trigger topic_nodes_gate_trg
  before insert or update on public.topic_nodes
  for each row execute function public.topic_nodes_gate();

-- Grade history (content grader writes here; rubric versioned for comparability).
create table if not exists public.article_grades (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null,
  version int not null default 1,
  rubric_version text not null,
  score numeric not null,
  breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists article_grades_article_idx on public.article_grades(article_id);

-- Both engines stamp the map going forward (legacy pipeline match-or-creates).
alter table public.articles add column if not exists topic_node_id uuid;

alter table public.topic_nodes enable row level security;
alter table public.topic_edges enable row level security;
alter table public.article_grades enable row level security;
create policy topic_nodes_admin_all on public.topic_nodes
  for all using (public.is_admin()) with check (public.is_admin());
create policy topic_edges_admin_all on public.topic_edges
  for all using (public.is_admin()) with check (public.is_admin());
create policy article_grades_admin_all on public.article_grades
  for all using (public.is_admin()) with check (public.is_admin());

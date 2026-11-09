create table public.silkworm_cohorts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  source text not null default '',
  lineage text not null default '',
  parent_cohort_id uuid,
  stage text not null check (stage in ('Eggs', 'Diapause', 'Incubating', 'Hatching', 'Larvae', 'Cocoons', 'Moths', 'Closed')),
  location text not null default '',
  population integer check (population >= 0),
  eggs_set integer check (eggs_set >= 0),
  hatched integer check (hatched >= 0 and (eggs_set is null or hatched <= eggs_set)),
  incubation_start date,
  expected_hatch date,
  first_hatch date,
  target_temp numeric,
  target_rh numeric check (target_rh between 0 and 100),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, parent_cohort_id) references public.silkworm_cohorts(user_id, id),
  check (parent_cohort_id <> id)
);

create table public.silkworm_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cohort_id uuid not null,
  kind text not null check (kind in ('Environment', 'Feeding', 'Moth pairing', 'Egg laying', 'Diapause', 'Milestone')),
  occurred_at timestamptz not null,
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, cohort_id) references public.silkworm_cohorts(user_id, id) on delete cascade
);

create index silkworm_cohorts_parent on public.silkworm_cohorts(user_id, parent_cohort_id);
create index silkworm_events_cohort_date on public.silkworm_events(user_id, cohort_id, occurred_at);

alter table public.silkworm_cohorts enable row level security;
alter table public.silkworm_events enable row level security;
revoke all on public.silkworm_cohorts, public.silkworm_events from public, anon, authenticated;
grant select, insert, update on public.silkworm_cohorts, public.silkworm_events to authenticated;

create policy silkworm_cohorts_owner on public.silkworm_cohorts
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy silkworm_events_owner on public.silkworm_events
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create trigger set_updated_at before update on public.silkworm_cohorts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.silkworm_events
  for each row execute function public.set_updated_at();

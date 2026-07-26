create table public.label_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  width_in numeric not null check (width_in > 0),
  height_in numeric not null check (height_in > 0),
  fields jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  font_scale numeric not null default 1 check (font_scale between 0.5 and 2),
  qr_size_in numeric not null default 0.8 check (qr_size_in >= 0),
  barcode_height_in numeric not null default 0.35
    check (barcode_height_in >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name)
);

create index label_templates_user_updated
  on public.label_templates(user_id, updated_at desc);

create trigger set_updated_at
  before update on public.label_templates
  for each row execute procedure public.set_updated_at();

alter table public.label_templates enable row level security;

create policy label_templates_select_own
  on public.label_templates for select to authenticated
  using ((select auth.uid()) = user_id);
create policy label_templates_insert_own
  on public.label_templates for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy label_templates_update_own
  on public.label_templates for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy label_templates_delete_own
  on public.label_templates for delete to authenticated
  using ((select auth.uid()) = user_id);

alter publication supabase_realtime add table public.label_templates;

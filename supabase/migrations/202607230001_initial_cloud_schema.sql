create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, user_id, display_name)
  values (new.id, new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  name text not null,
  description text,
  type text not null,
  parent_space_id uuid,
  archived_at timestamptz,
  light_notes text,
  temperature_notes text,
  humidity_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  foreign key (user_id, parent_space_id)
    references public.spaces(user_id, id) on delete set null (parent_space_id)
);

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  nickname text not null,
  scientific_name text not null,
  common_name text,
  cultivar text,
  vendor text,
  kind text not null check (kind in ('plant', 'animal')),
  status text not null check (status in ('active', 'archived')),
  favorite boolean not null default false,
  purchase_date date,
  hero_image_url text,
  hero_media_id uuid,
  space_id uuid,
  water_interval_days integer,
  fertilizer_interval_days integer,
  mounted boolean,
  moss_pole boolean,
  care_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  foreign key (user_id, space_id)
    references public.spaces(user_id, id) on delete set null (space_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  plant_id uuid,
  space_id uuid,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null,
  status text not null,
  type text not null,
  recurrence text,
  recurrence_interval_days integer,
  recurrence_source_id uuid,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  foreign key (user_id, plant_id)
    references public.plants(user_id, id) on delete set null (plant_id),
  foreign key (user_id, space_id)
    references public.spaces(user_id, id) on delete set null (space_id),
  foreign key (user_id, recurrence_source_id)
    references public.tasks(user_id, id) on delete set null (recurrence_source_id)
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  plant_id uuid,
  space_id uuid,
  title text not null,
  description text,
  event_type text not null,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  is_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  foreign key (user_id, plant_id)
    references public.plants(user_id, id) on delete cascade,
  foreign key (user_id, space_id)
    references public.spaces(user_id, id) on delete set null (space_id)
);

create table public.plant_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  plant_id uuid not null,
  storage_path text not null,
  thumbnail_path text,
  file_name text not null,
  mime_type text not null,
  width integer,
  height integer,
  file_size bigint not null,
  date_taken timestamptz,
  uploaded_at timestamptz not null default now(),
  is_hero boolean not null default false,
  is_favorite boolean not null default false,
  notes text,
  tags text[] not null default '{}',
  camera_make text,
  camera_model text,
  lens_model text,
  orientation integer,
  fingerprint text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, plant_id, fingerprint),
  foreign key (user_id, plant_id)
    references public.plants(user_id, id) on delete cascade
);

create unique index plant_media_one_hero
  on public.plant_media(user_id, plant_id) where is_hero;

alter table public.plants
  add constraint plants_hero_media_owner_fk
  foreign key (user_id, hero_media_id)
  references public.plant_media(user_id, id)
  on delete set null (hero_media_id);

create table public.plant_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  plant_id uuid not null,
  property_key text not null,
  label text not null,
  value jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, plant_id, property_key),
  foreign key (user_id, plant_id)
    references public.plants(user_id, id) on delete cascade
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name)
);

create table public.plant_tag_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, plant_id, tag_id),
  foreign key (user_id, plant_id)
    references public.plants(user_id, id) on delete cascade,
  foreign key (user_id, tag_id)
    references public.tags(user_id, id) on delete cascade
);

create table public.feeder_species (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  name text not null,
  scientific_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, name)
);

create table public.feeder_colonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  colony_id text not null,
  name text not null,
  species_id uuid not null,
  type text not null,
  status text not null,
  date_started date not null,
  source text,
  bin_id text not null,
  location text,
  estimated_population integer,
  adult_females integer,
  adult_males integer,
  juveniles integer,
  temperature numeric,
  humidity numeric,
  food text,
  moisture_source text,
  production_status text,
  notes text,
  qr_value text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, colony_id),
  unique (user_id, qr_value),
  foreign key (user_id, species_id)
    references public.feeder_species(user_id, id) on delete restrict
);

create table public.cricket_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  batch_id text not null,
  parent_colony_id uuid,
  breeder_started_at timestamptz,
  substrate_added_at timestamptz,
  eggs_collected_at timestamptz,
  eggs_moved_at timestamptz,
  incubation_temperature numeric,
  incubation_humidity numeric,
  estimated_hatch_at timestamptz,
  first_hatch_at timestamptz,
  main_hatch_at timestamptz,
  estimated_hatched integer,
  size text not null,
  quantity numeric not null,
  bin_id text not null,
  stage text not null,
  last_fed_at timestamptz,
  last_moisture_at timestamptz,
  notes text,
  qr_value text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, batch_id),
  unique (user_id, qr_value),
  foreign key (user_id, parent_colony_id)
    references public.feeder_colonies(user_id, id) on delete set null (parent_colony_id)
);

create table public.feeder_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  inventory_id text not null,
  species_id uuid not null,
  variety text,
  size text not null,
  quantity numeric not null,
  unit text not null,
  source_colony_id uuid,
  source_batch_id uuid,
  storage_bin text not null,
  date_added date not null,
  date_purchased date,
  supplier text,
  cost numeric,
  gut_load_status text,
  gut_load_started_at timestamptz,
  last_fed_at timestamptz,
  last_moisture_at timestamptz,
  use_by_at timestamptz,
  minimum_stock numeric not null default 0,
  status text not null,
  notes text,
  qr_value text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, inventory_id),
  unique (user_id, qr_value),
  foreign key (user_id, species_id)
    references public.feeder_species(user_id, id) on delete restrict,
  foreign key (user_id, source_colony_id)
    references public.feeder_colonies(user_id, id) on delete set null (source_colony_id),
  foreign key (user_id, source_batch_id)
    references public.cricket_batches(user_id, id) on delete set null (source_batch_id)
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  inventory_id uuid not null,
  action text not null,
  quantity_delta numeric not null,
  balance_after numeric not null,
  occurred_at timestamptz not null,
  source_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  foreign key (user_id, inventory_id)
    references public.feeder_inventory(user_id, id) on delete cascade
);

create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  colony_id uuid,
  batch_id uuid,
  action text not null,
  occurred_at timestamptz not null,
  material text,
  amount text,
  temperature numeric,
  humidity numeric,
  observations text,
  mortality numeric,
  notes text,
  user_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  check (colony_id is not null or batch_id is not null),
  foreign key (user_id, colony_id)
    references public.feeder_colonies(user_id, id) on delete cascade,
  foreign key (user_id, batch_id)
    references public.cricket_batches(user_id, id) on delete cascade
);

create table public.harvest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  harvest_id text not null,
  occurred_at timestamptz not null,
  colony_id uuid,
  batch_id uuid,
  species_id uuid not null,
  size text not null,
  quantity numeric not null,
  unit text not null,
  destination text not null,
  animal_id uuid,
  inventory_id uuid,
  mortality numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, harvest_id),
  foreign key (user_id, colony_id)
    references public.feeder_colonies(user_id, id) on delete set null (colony_id),
  foreign key (user_id, batch_id)
    references public.cricket_batches(user_id, id) on delete set null (batch_id),
  foreign key (user_id, species_id)
    references public.feeder_species(user_id, id) on delete restrict,
  foreign key (user_id, animal_id)
    references public.plants(user_id, id) on delete set null (animal_id),
  foreign key (user_id, inventory_id)
    references public.feeder_inventory(user_id, id) on delete set null (inventory_id)
);

create table public.feeding_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  occurred_at timestamptz not null,
  animal_id uuid,
  animal_name text,
  species_id uuid not null,
  size text not null,
  quantity_offered numeric not null,
  quantity_eaten numeric not null,
  inventory_id uuid,
  colony_id uuid,
  batch_id uuid,
  supplements text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  foreign key (user_id, animal_id)
    references public.plants(user_id, id) on delete set null (animal_id),
  foreign key (user_id, species_id)
    references public.feeder_species(user_id, id) on delete restrict,
  foreign key (user_id, inventory_id)
    references public.feeder_inventory(user_id, id) on delete set null (inventory_id),
  foreign key (user_id, colony_id)
    references public.feeder_colonies(user_id, id) on delete set null (colony_id),
  foreign key (user_id, batch_id)
    references public.cricket_batches(user_id, id) on delete set null (batch_id)
);

create table public.feeder_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  key text not null,
  value numeric not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, legacy_id),
  unique (user_id, key)
);

create table public.local_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_fingerprint text not null,
  status text not null check (status in ('pending', 'running', 'partial', 'complete')),
  counts jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, source_fingerprint)
);

create index plants_user_status_idx on public.plants(user_id, status);
create index plants_user_space_idx on public.plants(user_id, space_id);
create index tasks_user_status_due_idx on public.tasks(user_id, status, due_at);
create index timeline_user_occurred_idx on public.timeline_events(user_id, occurred_at desc);
create index timeline_user_plant_idx on public.timeline_events(user_id, plant_id, occurred_at desc);
create index media_user_plant_idx on public.plant_media(user_id, plant_id, uploaded_at desc);
create index colonies_user_status_idx on public.feeder_colonies(user_id, status);
create index batches_user_stage_idx on public.cricket_batches(user_id, stage);
create index inventory_user_status_idx on public.feeder_inventory(user_id, status);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'spaces', 'plants', 'tasks', 'timeline_events', 'plant_media',
    'plant_properties', 'tags', 'plant_tag_links', 'feeder_species',
    'feeder_colonies', 'cricket_batches', 'feeder_inventory',
    'inventory_transactions', 'maintenance_logs', 'harvest_logs',
    'feeding_logs', 'feeder_settings', 'local_imports'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name
    );
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-media',
  'plant-media',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy plant_media_storage_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'plant-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy plant_media_storage_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'plant-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy plant_media_storage_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'plant-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'plant-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy plant_media_storage_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'plant-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter publication supabase_realtime add table
  public.plants,
  public.spaces,
  public.tasks,
  public.timeline_events,
  public.plant_media;

-- Additive, rerunnable after the tracked Care/Tasks migration. Run manually.
begin;
create table if not exists public.reptiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) > 0), species text not null check(length(trim(species)) > 0),
 sex text not null default 'unknown' check(sex in ('male','female','unknown')),
 status text not null default 'active' check(status in ('active','archived')),
 identification jsonb not null default '{}' check(jsonb_typeof(identification)='object'),
 husbandry jsonb not null default '{}' check(jsonb_typeof(husbandry)='object'),
 attention boolean not null default false, deleting boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table if not exists public.reptile_supplements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name))>0), brand text not null default '',
 category text not null check(category in ('calcium-no-d3','calcium-d3','multivitamin','other')),
 d3 text not null default 'unknown' check(d3 in ('yes','no','unknown')), notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table if not exists public.reptile_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 reptile_id uuid not null, kind text not null check(kind in ('weight','feeding','supplement','husbandry','health','milestone','task')),
 occurred_at timestamptz not null default now(), notes text not null default '',
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id), unique(user_id,reptile_id,id),
 foreign key(user_id,reptile_id) references public.reptiles(user_id,id) on delete cascade,
 check(kind<>'weight' or (payload ? 'grams' and jsonb_typeof(payload->'grams')='number' and (payload->>'grams')::numeric>0))
);
create index if not exists reptile_events_owner_animal_date on public.reptile_events(user_id,reptile_id,occurred_at);
create table if not exists public.reptile_routines (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 reptile_id uuid not null, supplement_id uuid,
 title text not null check(length(trim(title))>0), type text not null check(type in ('feed','supplement','weigh','clean','check-uvb','replace-uvb','inspect','vet','custom')),
 frequency text not null check(frequency in ('once','feeding','days','weeks','weekdays','monthly','custom')),
 interval_count integer not null default 1 check(interval_count between 1 and 3650),
 weekdays integer[] not null default '{}', custom_dates date[] not null default '{}',
 starts_at timestamptz not null, timezone text not null default 'UTC', enabled boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,id), foreign key(user_id,reptile_id) references public.reptiles(user_id,id) on delete cascade,
 foreign key(user_id,supplement_id) references public.reptile_supplements(user_id,id),
 check(type<>'supplement' or supplement_id is not null),
 check(frequency<>'feeding' or type='supplement'),
 check(frequency<>'weekdays' or (cardinality(weekdays)>0 and weekdays <@ array[0,1,2,3,4,5,6])),
 check(frequency<>'custom' or cardinality(custom_dates)>0)
);
create index if not exists reptile_routines_owner_animal on public.reptile_routines(user_id,reptile_id);
create index if not exists reptile_routines_product on public.reptile_routines(user_id,supplement_id);
create table if not exists public.reptile_media (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 reptile_id uuid not null, event_id uuid, file_name text not null, storage_path text not null, thumbnail_path text,
 is_profile boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
 foreign key(user_id,reptile_id) references public.reptiles(user_id,id) on delete cascade,
 foreign key(user_id,reptile_id,event_id) references public.reptile_events(user_id,reptile_id,id) on delete set null (event_id),
 check(storage_path like user_id::text || '/reptiles/' || reptile_id::text || '/%'),
 check(thumbnail_path is null or thumbnail_path like user_id::text || '/reptiles/' || reptile_id::text || '/%')
);
create index if not exists reptile_media_owner_animal on public.reptile_media(user_id,reptile_id);
create index if not exists reptile_media_event on public.reptile_media(user_id,reptile_id,event_id);
alter table public.tasks add column if not exists reptile_routine_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='tasks_reptile_routine_owner_fk') then
  alter table public.tasks add constraint tasks_reptile_routine_owner_fk foreign key(user_id,reptile_routine_id) references public.reptile_routines(user_id,id) on delete cascade;
 end if;
end $$;
create index if not exists tasks_reptile_routine_idx on public.tasks(user_id,reptile_routine_id);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='reptile_tasks_separate_recurrence') then
  alter table public.tasks add constraint reptile_tasks_separate_recurrence check(reptile_routine_id is null or (plant_id is null and not care_managed and recurrence='none'));
 end if;
end $$;
create unique index if not exists reptile_tasks_successor_once on public.tasks(recurrence_source_id) where reptile_routine_id is not null and recurrence_source_id is not null;

do $$ declare t text; begin
 foreach t in array array['reptiles','reptile_events','reptile_supplements','reptile_routines','reptile_media'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists reptile_owner on public.%I',t);
  execute format('create policy reptile_owner on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('drop trigger if exists reptile_updated_at on public.%I',t);
  execute format('create trigger reptile_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
 end loop;
end $$;

create or replace function public.reptile_next_due(r public.reptile_routines, after_time timestamptz)
returns timestamptz language plpgsql stable security invoker set search_path='' as $$
declare base timestamp; candidate timestamp; d date; n integer; begin
 if not exists(select 1 from pg_timezone_names where name=r.timezone) then raise exception 'Invalid schedule timezone'; end if;
 base := after_time at time zone r.timezone;
 if r.frequency in ('once','feeding') then return null; end if;
 if r.frequency='days' then return (base + make_interval(days=>r.interval_count)) at time zone r.timezone; end if;
 if r.frequency='weeks' then return (base + make_interval(days=>r.interval_count*7)) at time zone r.timezone; end if;
 if r.frequency='monthly' then return (base + interval '1 month') at time zone r.timezone; end if;
 if r.frequency='weekdays' then
  for n in 1..7 loop
   candidate := base + make_interval(days=>n);
   if extract(dow from candidate)::integer=any(r.weekdays) then return candidate at time zone r.timezone; end if;
  end loop;
 end if;
 if r.frequency='custom' then
  select min(value) into d from unnest(r.custom_dates) value where value>base::date;
  return (d + (r.starts_at at time zone r.timezone)::time) at time zone r.timezone;
 end if;
 return null;
end $$;

create or replace function public.reptile_child_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare animal public.reptiles; item jsonb; begin
 select * into strict animal from public.reptiles where id=new.reptile_id and user_id=auth.uid() for update;
 if animal.deleting and not (tg_table_name='reptile_routines' and to_jsonb(new)->>'enabled'='false') then raise exception 'This reptile is being deleted'; end if;
 if tg_table_name='reptile_events' then
  if new.occurred_at>now()+interval '1 minute' then raise exception 'Actual records cannot be in the future'; end if;
  if new.kind='feeding' then
   if jsonb_typeof(new.payload->'feeders') is distinct from 'array' or jsonb_array_length(new.payload->'feeders')=0 then raise exception 'Add at least one feeder'; end if;
   for item in select * from jsonb_array_elements(new.payload->'feeders') loop
    if coalesce(trim(item->>'type'),'')='' or coalesce((item->>'offered')::numeric,-1)<0 or coalesce((item->>'consumed')::numeric,-1)<0 or (item->>'consumed')::numeric>(item->>'offered')::numeric then raise exception 'Invalid feeder quantities'; end if;
   end loop;
  end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['reptile_events','reptile_routines','reptile_media'] loop
  execute format('drop trigger if exists reptile_child_owner_guard on public.%I',t);
  execute format('create trigger reptile_child_owner_guard before insert or update on public.%I for each row execute function public.reptile_child_guard()',t);
 end loop;
end $$;

create or replace function public.reptile_routine_tasks() returns trigger language plpgsql security invoker set search_path='' as $$
declare animal public.reptiles; due timestamptz; begin
 select * into strict animal from public.reptiles where id=new.reptile_id and user_id=auth.uid();
 perform public.reptile_next_due(new,new.starts_at); -- validates timezone
 if not new.enabled or animal.status='archived' then
  update public.tasks set status='archived',archived_at=now() where reptile_routine_id=new.id and status='open';
  return new;
 end if;
 if new.frequency='feeding' then
  if tg_op='UPDATE' and old.frequency<>'feeding' then update public.tasks set status='archived',archived_at=now() where reptile_routine_id=new.id and status='open'; end if;
  return new;
 end if;
 due:=new.starts_at;
 if new.frequency='weekdays' and not(extract(dow from due at time zone new.timezone)::integer=any(new.weekdays)) then due:=public.reptile_next_due(new,due); end if;
 if new.frequency='custom' then
  select (min(d)+(new.starts_at at time zone new.timezone)::time) at time zone new.timezone into due from unnest(new.custom_dates) d where d >= (new.starts_at at time zone new.timezone)::date;
 end if;
 if due is null then raise exception 'No custom dates on or after the start date'; end if;
 update public.tasks set status='archived',archived_at=now() where reptile_routine_id=new.id and status='open' and id<>(select id from public.tasks where reptile_routine_id=new.id and status='open' order by created_at,id limit 1);
 update public.tasks set title=new.title||' — '||animal.name,due_at=due where reptile_routine_id=new.id and status='open';
 if not found then
  insert into public.tasks(user_id,title,type,status,priority,recurrence,due_at,reptile_routine_id)
  values(new.user_id,new.title||' — '||animal.name,'custom','open','normal','none',due,new.id);
 end if;
 return new;
end $$;
drop trigger if exists reptile_routine_tasks on public.reptile_routines;
create trigger reptile_routine_tasks after insert or update on public.reptile_routines for each row execute function public.reptile_routine_tasks();

create or replace function public.reptile_task_finished() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.reptile_routines; product public.reptile_supplements; due timestamptz; begin
 if new.reptile_routine_id is null or new.status=old.status then return new; end if;
 if old.status<>'open' then raise exception 'Reptile task history cannot be reopened; create a new task'; end if;
 if new.status not in ('completed','skipped') then return new; end if;
 select * into strict r from public.reptile_routines where id=new.reptile_routine_id and user_id=auth.uid() for update;
 select * into product from public.reptile_supplements where id=r.supplement_id;
 insert into public.reptile_events(user_id,reptile_id,kind,occurred_at,notes,payload)
 values(new.user_id,r.reptile_id,case when r.type='supplement' and new.status='completed' then 'supplement' else 'task' end,coalesce(new.completed_at,now()),r.title,
 jsonb_build_object('taskId',new.id,'routineId',r.id,'status',new.status,'product',product.name,'brand',product.brand,'d3',product.d3));
 if r.enabled and exists(select 1 from public.reptiles where id=r.reptile_id and status='active' and not deleting) then
  due:=public.reptile_next_due(r,greatest(new.due_at,coalesce(new.completed_at,now())));
  if due is not null then
   insert into public.tasks(user_id,title,type,status,priority,recurrence,due_at,reptile_routine_id,recurrence_source_id)
   values(new.user_id,new.title,'custom','open',new.priority,'none',due,r.id,new.id);
  end if;
 end if;
 return new;
end $$;
drop trigger if exists reptile_task_finished on public.tasks;
create trigger reptile_task_finished after update on public.tasks for each row execute function public.reptile_task_finished();

create or replace function public.reptile_feeding_tasks() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.reptile_routines; animal public.reptiles; begin
 if new.kind<>'feeding' then return new; end if;
 select * into animal from public.reptiles where id=new.reptile_id;
 if animal.status<>'active' then return new; end if;
 for r in select * from public.reptile_routines where reptile_id=new.reptile_id and enabled and frequency='feeding' loop
  insert into public.tasks(user_id,title,type,status,priority,recurrence,due_at,reptile_routine_id,description)
  values(new.user_id,r.title||' — '||animal.name,'custom','open','normal','none',new.occurred_at,r.id,'Feeding event '||new.id::text||'. Not yet administered.');
 end loop;
 return new;
end $$;
drop trigger if exists reptile_feeding_tasks on public.reptile_events;
create trigger reptile_feeding_tasks after insert on public.reptile_events for each row execute function public.reptile_feeding_tasks();

create or replace function public.reptile_archive_tasks() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.husbandry is distinct from old.husbandry and not new.deleting then
  insert into public.reptile_events(user_id,reptile_id,kind,payload,notes) values(new.user_id,new.id,'husbandry',new.husbandry,'Husbandry setup updated');
 end if;
 if new.status='archived' or new.deleting then
  update public.reptile_routines set enabled=false where reptile_id=new.id and enabled;
 end if;
 return new;
end $$;
drop trigger if exists reptile_archive_tasks on public.reptiles;
create trigger reptile_archive_tasks after update on public.reptiles for each row execute function public.reptile_archive_tasks();

-- A bulk assignment creates one independently completable routine per animal.
-- One database transaction prevents partial assignment if any animal is invalid.
create or replace function public.create_reptile_routines(input jsonb, reptile_ids uuid[])
returns void language plpgsql security invoker set search_path='' as $$
declare animal_id uuid; begin
 if auth.uid() is null or cardinality(reptile_ids)=0 then raise exception 'Select at least one owned reptile'; end if;
 foreach animal_id in array reptile_ids loop
  if not exists(select 1 from public.reptiles where id=animal_id and user_id=auth.uid() and status='active' and not deleting) then raise exception 'Select active owned reptiles'; end if;
  insert into public.reptile_routines(user_id,reptile_id,supplement_id,title,type,frequency,interval_count,weekdays,custom_dates,starts_at,timezone,enabled)
  values(auth.uid(),animal_id,nullif(input->>'supplement_id','')::uuid,input->>'title',input->>'type',input->>'frequency',(input->>'interval_count')::integer,
  array(select value::integer from jsonb_array_elements_text(input->'weekdays')),array(select value::date from jsonb_array_elements_text(input->'custom_dates')),
  (input->>'starts_at')::timestamptz,input->>'timezone',(input->>'enabled')::boolean);
 end loop;
end $$;
revoke all on function public.create_reptile_routines(jsonb,uuid[]) from public;
grant execute on function public.create_reptile_routines(jsonb,uuid[]) to authenticated;
-- Internal trigger helpers remain invoker-only. No privilege escalation.
revoke all on function public.reptile_next_due(public.reptile_routines,timestamptz), public.reptile_child_guard(), public.reptile_routine_tasks(), public.reptile_task_finished(), public.reptile_feeding_tasks(), public.reptile_archive_tasks() from public;
grant execute on function public.reptile_next_due(public.reptile_routines,timestamptz), public.reptile_child_guard(), public.reptile_routine_tasks(), public.reptile_task_finished(), public.reptile_feeding_tasks(), public.reptile_archive_tasks() to authenticated;
commit;

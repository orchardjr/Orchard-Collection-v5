-- Additive care/task upgrade. Safe to rerun against this same schema version.
begin;

alter table public.plants add column if not exists last_watered_at timestamptz;
alter table public.plants add column if not exists last_fertilized_at timestamptz;
alter table public.tasks add column if not exists care_managed boolean not null default false;

create table if not exists public.task_plants (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  plant_id uuid not null,
  primary key (task_id, plant_id),
  foreign key (user_id, task_id) references public.tasks(user_id, id) on delete cascade,
  foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade
);
create index if not exists task_plants_owner_plant_idx on public.task_plants(user_id, plant_id);
alter table public.task_plants enable row level security;
drop policy if exists task_plants_owner on public.task_plants;
create policy task_plants_owner on public.task_plants for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.task_plants to authenticated;
insert into public.task_plants(user_id, task_id, plant_id)
select user_id, id, plant_id from public.tasks where plant_id is not null
on conflict do nothing;
create unique index if not exists tasks_one_open_care_routine
  on public.tasks(user_id, plant_id, type) where care_managed and status = 'open';

create or replace function public.collection_task_json(t public.tasks)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select to_jsonb(t) || jsonb_build_object('plant_ids', coalesce(
    (select jsonb_agg(a.plant_id order by a.plant_id) from public.task_plants a where a.task_id = t.id),
    case when t.plant_id is null then '[]'::jsonb else jsonb_build_array(t.plant_id) end))
$$;

create or replace function public.save_collection_task(task_input jsonb, target_task_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  t public.tasks;
  merged jsonb;
  ids uuid[];
  pid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to manage tasks' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if target_task_id is not null then
    select * into strict t from public.tasks where id = target_task_id and user_id = auth.uid() for update;
    if t.care_managed then raise exception 'Edit this routine in the Care tab'; end if;
    merged := public.collection_task_json(t) || task_input;
  else
    merged := task_input;
  end if;
  select coalesce(array_agg(distinct value::uuid), '{}'::uuid[]) into ids
    from jsonb_array_elements_text(coalesce(merged->'plant_ids',
      case when merged->>'plant_id' is null then '[]'::jsonb else jsonb_build_array(merged->>'plant_id') end));
  if exists (select 1 from unnest(ids) p(id) where not exists (
    select 1 from public.plants where id = p.id and user_id = auth.uid()
  )) then raise exception 'An assigned plant is unavailable or belongs to another user' using errcode = '42501'; end if;
  if coalesce(length(trim(merged->>'title')), 0) = 0 then raise exception 'Task name is required'; end if;
  if coalesce(merged->>'type','custom') not in ('water','fertilize','repot','treat','prune','propagate','photograph','inspect','rotate','moss-pole','custom')
    then raise exception 'Invalid task type'; end if;
  if coalesce(merged->>'recurrence','none') not in ('none','daily','weekly','interval','monthly')
    then raise exception 'Invalid recurrence'; end if;
  if merged->>'recurrence' = 'interval' and coalesce((merged->>'recurrence_interval_days')::integer,0) not between 1 and 3650
    then raise exception 'Repeat interval must be 1 to 3650 days'; end if;
  if coalesce(merged->>'status','open') not in ('open','completed','skipped','archived')
    then raise exception 'Invalid status'; end if;
  if target_task_id is not null and t.status = 'open' and merged->>'status' = 'completed'
    then raise exception 'Use task completion to update care dates consistently'; end if;
  if target_task_id is not null and t.status = 'completed' and merged->>'status' = 'open' and coalesce(t.recurrence,'none') <> 'none'
    then raise exception 'Use the next scheduled occurrence'; end if;
  if target_task_id is null then
    insert into public.tasks(user_id,title,priority,status,type)
    values(auth.uid(),trim(merged->>'title'),coalesce(merged->>'priority','normal'),'open',coalesce(merged->>'type','custom'))
    returning * into t;
  end if;
  update public.tasks set
    title = trim(merged->>'title'), description = merged->>'description',
    plant_id = case when cardinality(ids) = 1 then ids[1] else null end,
    space_id = (merged->>'space_id')::uuid,
    priority = coalesce(merged->>'priority','normal'),
    status = case when target_task_id is null then 'open' else coalesce(merged->>'status','open') end,
    type = coalesce(merged->>'type','custom'), due_at = (merged->>'due_at')::timestamptz,
    recurrence = coalesce(merged->>'recurrence','none'),
    recurrence_interval_days = (merged->>'recurrence_interval_days')::integer,
    completed_at = case when target_task_id is null then null else (merged->>'completed_at')::timestamptz end,
    archived_at = (merged->>'archived_at')::timestamptz
  where id = t.id returning * into t;
  delete from public.task_plants where task_id = t.id;
  foreach pid in array ids loop
    insert into public.task_plants values(auth.uid(), t.id, pid);
    if target_task_id is null then
      insert into public.timeline_events(user_id,plant_id,space_id,title,description,event_type,occurred_at,metadata)
      values(auth.uid(),pid,t.space_id,'Task created',t.title,'task',now(),jsonb_build_object('taskId',t.id));
    end if;
  end loop;
  return public.collection_task_json(t);
end;
$$;

create or replace function public.save_plant_care(target_plant_id uuid, profile jsonb, client_timezone text default 'UTC')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  p public.plants;
  routine public.tasks;
  kind text;
  days integer;
  enabled boolean;
  last_date timestamptz;
  due timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in to edit care' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  perform set_config('TimeZone', client_timezone, true);
  select * into strict p from public.plants where id = target_plant_id and user_id = auth.uid() for update;
  foreach kind in array array['water','fertilizer'] loop
    days := coalesce((profile->>(kind || '_interval_days'))::integer,0);
    if days not between 0 and 3650 then raise exception 'Care intervals must be 1 to 3650 days or disabled'; end if;
  end loop;
  if (profile->>'last_watered_at')::timestamptz > now() or (profile->>'last_fertilized_at')::timestamptz > now()
    then raise exception 'Last completed dates cannot be in the future'; end if;
  update public.plants set
    water_interval_days = coalesce((profile->>'water_interval_days')::integer,0),
    fertilizer_interval_days = coalesce((profile->>'fertilizer_interval_days')::integer,0),
    last_watered_at = (profile->>'last_watered_at')::timestamptz,
    last_fertilized_at = (profile->>'last_fertilized_at')::timestamptz,
    mounted = coalesce((profile->>'mounted')::boolean,false),
    moss_pole = coalesce((profile->>'moss_pole')::boolean,false),
    care_notes = profile->>'care_notes'
  where id = p.id returning * into p;
  foreach kind in array array['water','fertilize'] loop
    days := case when kind = 'water' then p.water_interval_days else p.fertilizer_interval_days end;
    enabled := coalesce((profile->>(case when kind = 'water' then 'water_task' else 'fertilizer_task' end))::boolean,false);
    last_date := case when kind = 'water' then p.last_watered_at else p.last_fertilized_at end;
    select * into routine from public.tasks t
      where user_id = auth.uid() and plant_id = p.id and type = kind and status = 'open'
        and (care_managed or (enabled and days > 0 and coalesce(recurrence,'none') <> 'none'
          and not exists(select 1 from public.task_plants a where a.task_id=t.id and a.plant_id<>p.id)))
      order by care_managed desc, created_at, id limit 1 for update;
    if not enabled or days = 0 then
      update public.tasks set status = 'archived', archived_at = now() where id = routine.id;
    else
      due := coalesce(last_date, routine.created_at, now()) + make_interval(days => days);
      if routine.id is null then
        insert into public.tasks(user_id,plant_id,title,type,status,priority,recurrence,recurrence_interval_days,due_at,care_managed)
        values(auth.uid(),p.id,case when kind = 'water' then 'Water' else 'Fertilize' end,kind,'open','normal','interval',days,due,true)
        returning * into routine;
        insert into public.task_plants values(auth.uid(),routine.id,p.id);
      else
        update public.tasks set care_managed = true, recurrence = 'interval', recurrence_interval_days = days, due_at = due where id = routine.id;
      end if;
    end if;
  end loop;
  return to_jsonb(p);
end;
$$;

create or replace function public.complete_collection_task(target_task_id uuid, client_timezone text default 'UTC')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  t public.tasks;
  next_task public.tasks;
  p public.plants;
  ids uuid[];
  pid uuid;
  next_due timestamptz;
  days integer;
  completed_time timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Sign in to complete tasks' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  perform set_config('TimeZone', client_timezone, true);
  select * into strict t from public.tasks where id = target_task_id and user_id = auth.uid() for update;
  if t.status <> 'open' then return public.collection_task_json(t); end if;
  select coalesce(array_agg(value::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(public.collection_task_json(t)->'plant_ids');
  update public.tasks set status = 'completed', completed_at = completed_time where id = t.id returning * into t;
  if coalesce(t.recurrence,'none') <> 'none' then
    next_due := case t.recurrence
      when 'daily' then completed_time + interval '1 day'
      when 'weekly' then completed_time + interval '7 days'
      when 'monthly' then completed_time + interval '1 month'
      else completed_time + make_interval(days => greatest(1,coalesce(t.recurrence_interval_days,1))) end;
    if not exists(select 1 from public.tasks where user_id = auth.uid() and recurrence_source_id = t.id) then
      insert into public.tasks(user_id,plant_id,space_id,title,description,priority,status,type,recurrence,recurrence_interval_days,recurrence_source_id,due_at,care_managed)
      values(auth.uid(),t.plant_id,t.space_id,t.title,t.description,t.priority,'open',t.type,t.recurrence,t.recurrence_interval_days,t.id,next_due,t.care_managed)
      returning * into next_task;
      foreach pid in array ids loop insert into public.task_plants values(auth.uid(),next_task.id,pid); end loop;
    end if;
  end if;
  foreach pid in array ids loop
    if t.type in ('water','fertilize') then
      update public.plants set
        last_watered_at = case when t.type = 'water' then completed_time else last_watered_at end,
        last_fertilized_at = case when t.type = 'fertilize' then completed_time else last_fertilized_at end
      where id = pid and user_id = auth.uid() returning * into p;
      days := case when t.type = 'water' then p.water_interval_days else p.fertilizer_interval_days end;
      if days > 0 then
        update public.tasks set due_at = completed_time + make_interval(days => days)
        where user_id = auth.uid() and plant_id = pid and care_managed and status = 'open' and type = t.type;
      end if;
    end if;
    insert into public.timeline_events(user_id,plant_id,space_id,title,description,event_type,occurred_at,metadata)
    values(auth.uid(),pid,t.space_id,'Task completed',t.title,'task',completed_time,jsonb_build_object('taskId',t.id));
  end loop;
  return public.collection_task_json(t);
end;
$$;

revoke all on function public.collection_task_json(public.tasks) from public;
revoke all on function public.save_collection_task(jsonb,uuid) from public;
revoke all on function public.save_plant_care(uuid,jsonb,text) from public;
revoke all on function public.complete_collection_task(uuid,text) from public;
grant execute on function public.collection_task_json(public.tasks) to authenticated;
grant execute on function public.save_collection_task(jsonb,uuid) to authenticated;
grant execute on function public.save_plant_care(uuid,jsonb,text) to authenticated;
grant execute on function public.complete_collection_task(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;

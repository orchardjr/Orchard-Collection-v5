-- DESTRUCTIVE FOR REPTILE DATA ONLY. Export reptile records and photos first.
-- Clean up owner-scoped <user-id>/reptiles/ Storage objects through Storage APIs
-- BEFORE running this. This SQL intentionally never deletes storage.objects.
-- Run manually as the project administrator, with reptile clients offline.
begin;
drop trigger if exists reptile_task_finished on public.tasks;
delete from public.tasks where reptile_routine_id is not null;
alter table public.tasks drop column if exists reptile_routine_id;
drop trigger if exists reptile_archive_tasks on public.reptiles;
drop trigger if exists reptile_routine_tasks on public.reptile_routines;
drop trigger if exists reptile_feeding_tasks on public.reptile_events;
drop trigger if exists reptile_child_owner_guard on public.reptile_events;
drop trigger if exists reptile_child_owner_guard on public.reptile_routines;
drop trigger if exists reptile_child_owner_guard on public.reptile_media;
drop function if exists public.create_reptile_routines(jsonb,uuid[]);
drop function if exists public.reptile_archive_tasks();
drop function if exists public.reptile_feeding_tasks();
drop function if exists public.reptile_task_finished();
drop function if exists public.reptile_routine_tasks();
drop function if exists public.reptile_child_guard();
drop function if exists public.reptile_next_due(public.reptile_routines,timestamptz);
drop table if exists public.reptile_media;
drop table if exists public.reptile_events;
drop table if exists public.reptile_routines;
drop table if exists public.reptile_supplements;
drop table if exists public.reptiles;
commit;

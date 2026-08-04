create or replace function public.delete_plant_permanently(
  target_plant_id uuid
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  storage_paths text[];
begin
  if not exists (
    select 1
    from public.plants
    where id = target_plant_id
      and user_id = (select auth.uid())
  ) then
    raise no_data_found using
      message = 'Plant not found or is not owned by the current user';
  end if;

  select coalesce(array_agg(path), array[]::text[])
  into storage_paths
  from (
    select storage_path as path
    from public.plant_media
    where plant_id = target_plant_id
      and user_id = (select auth.uid())
    union all
    select thumbnail_path as path
    from public.plant_media
    where plant_id = target_plant_id
      and user_id = (select auth.uid())
      and thumbnail_path is not null
  ) paths;

  delete from public.nfc_tags
  where user_id = (select auth.uid())
    and resource_type = 'plant'
    and resource_id = target_plant_id;

  delete from public.tasks
  where user_id = (select auth.uid())
    and plant_id = target_plant_id;

  delete from public.plants
  where user_id = (select auth.uid())
    and id = target_plant_id;

  return storage_paths;
end;
$$;

revoke all on function public.delete_plant_permanently(uuid) from public;
grant execute on function public.delete_plant_permanently(uuid)
  to authenticated;

notify pgrst, 'reload schema';

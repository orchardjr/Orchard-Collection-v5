create or replace function public.set_plant_media_hero(
  target_plant_id uuid,
  target_media_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.plant_media
    where id = target_media_id
      and plant_id = target_plant_id
      and user_id = (select auth.uid())
  ) then
    raise exception 'Media does not belong to this plant';
  end if;

  update public.plant_media
  set is_hero = false
  where plant_id = target_plant_id
    and user_id = (select auth.uid())
    and is_hero;

  update public.plant_media
  set is_hero = true
  where id = target_media_id
    and user_id = (select auth.uid());
end;
$$;

create or replace function public.delete_media_and_promote(target_media_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_plant uuid;
  was_hero boolean;
begin
  select plant_id, is_hero into target_plant, was_hero
  from public.plant_media
  where id = target_media_id and user_id = (select auth.uid());

  if target_plant is null then
    return;
  end if;

  delete from public.plant_media
  where id = target_media_id and user_id = (select auth.uid());

  if was_hero then
    update public.plant_media
    set is_hero = true
    where id = (
      select id from public.plant_media
      where plant_id = target_plant and user_id = (select auth.uid())
      order by uploaded_at desc limit 1
    );
  end if;
end;
$$;

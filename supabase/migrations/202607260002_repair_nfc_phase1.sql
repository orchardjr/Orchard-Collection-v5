-- Production repair: the Phase 1 migration was recorded in source control but
-- its table and RPC surface are absent from the production PostgREST schema.
-- This migration recreates only the missing NFC Phase 1 dependencies.

create table public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_token uuid not null default gen_random_uuid(),
  resource_type text not null,
  resource_id uuid,
  uid text,
  nickname text,
  notes text,
  assigned_at timestamptz,
  scan_count integer not null default 0,
  first_scanned_at timestamptz,
  last_scanned_at timestamptz,
  last_scanned_device text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint nfc_tags_assignment_consistent check (
    (resource_id is null and assigned_at is null)
    or (resource_id is not null and assigned_at is not null)
  ),
  constraint nfc_tags_resource_type_present check (
    length(trim(resource_type)) > 0
  )
);

create unique index nfc_tags_public_token_key
  on public.nfc_tags(public_token);
create unique index nfc_tags_uid_per_user_key
  on public.nfc_tags(user_id, uid)
  where uid is not null;
create unique index nfc_tags_one_assignment_per_resource
  on public.nfc_tags(user_id, resource_type, resource_id)
  where resource_id is not null;
create index nfc_tags_assigned_by_user
  on public.nfc_tags(user_id, assigned_at desc)
  where resource_id is not null;
create index nfc_tags_unassigned_by_user
  on public.nfc_tags(user_id, created_at)
  where resource_id is null;

create or replace function public.validate_nfc_tag_resource()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.resource_id is null then
    return new;
  end if;

  case new.resource_type
    when 'plant' then
      if not exists (
        select 1
        from public.plants
        where id = new.resource_id and user_id = new.user_id
      ) then
        raise foreign_key_violation using
          message = 'NFC tag plant does not exist or is not owned by this user';
      end if;
    else
      raise check_violation using
        message = 'Unsupported NFC resource type';
  end case;

  return new;
end;
$$;

create trigger validate_nfc_tag_resource
  before insert or update of user_id, resource_type, resource_id
  on public.nfc_tags
  for each row execute procedure public.validate_nfc_tag_resource();

create trigger set_updated_at
  before update on public.nfc_tags
  for each row execute procedure public.set_updated_at();

alter table public.nfc_tags enable row level security;

create policy nfc_tags_select_own
  on public.nfc_tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy nfc_tags_insert_own
  on public.nfc_tags for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy nfc_tags_update_own
  on public.nfc_tags for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy nfc_tags_delete_own
  on public.nfc_tags for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.replace_nfc_tag(
  input_tag_id uuid,
  input_public_token uuid,
  input_uid text default null,
  input_nickname text default null,
  input_notes text default null
)
returns setof public.nfc_tags
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous public.nfc_tags;
begin
  select * into previous
  from public.nfc_tags
  where id = input_tag_id and user_id = (select auth.uid())
  for update;

  if previous.id is null or previous.resource_id is null then
    raise exception 'Assigned NFC tag not found';
  end if;

  update public.nfc_tags
  set resource_id = null, assigned_at = null
  where id = previous.id;

  return query
  insert into public.nfc_tags (
    user_id, public_token, resource_type, resource_id, uid,
    nickname, notes, assigned_at
  )
  values (
    previous.user_id, input_public_token, previous.resource_type,
    previous.resource_id, input_uid,
    coalesce(input_nickname, previous.nickname),
    coalesce(input_notes, previous.notes), now()
  )
  returning *;
end;
$$;

create or replace function public.scan_nfc_tag(
  token uuid,
  device text default null
)
returns table (
  public_token uuid,
  resource_type text,
  resource_id uuid,
  nickname text
)
language sql
security definer
set search_path = ''
as $$
  update public.nfc_tags
  set
    scan_count = nfc_tags.scan_count + 1,
    first_scanned_at = coalesce(nfc_tags.first_scanned_at, now()),
    last_scanned_at = now(),
    last_scanned_device = nullif(left(device, 500), '')
  where nfc_tags.public_token = token
    and nfc_tags.resource_id is not null
  returning
    nfc_tags.public_token,
    nfc_tags.resource_type,
    nfc_tags.resource_id,
    nfc_tags.nickname;
$$;

create or replace function public.record_nfc_scan(
  input_tag_id uuid,
  input_scanned_at timestamptz default now(),
  input_device text default null
)
returns setof public.nfc_tags
language sql
security invoker
set search_path = ''
as $$
  update public.nfc_tags
  set
    scan_count = nfc_tags.scan_count + 1,
    first_scanned_at = coalesce(
      nfc_tags.first_scanned_at,
      input_scanned_at
    ),
    last_scanned_at = input_scanned_at,
    last_scanned_device = nullif(left(input_device, 500), '')
  where nfc_tags.id = input_tag_id
    and nfc_tags.user_id = (select auth.uid())
    and nfc_tags.resource_id is not null
  returning *;
$$;

revoke all on table public.nfc_tags from anon;
grant select, insert, update, delete on table public.nfc_tags to authenticated;

revoke all on function public.validate_nfc_tag_resource() from public;
revoke all on function public.replace_nfc_tag(uuid, uuid, text, text, text)
  from public;
grant execute on function public.replace_nfc_tag(uuid, uuid, text, text, text)
  to authenticated;

revoke all on function public.scan_nfc_tag(uuid, text) from public;
grant execute on function public.scan_nfc_tag(uuid, text)
  to anon, authenticated;
revoke all on function public.record_nfc_scan(uuid, timestamptz, text)
  from public;
grant execute on function public.record_nfc_scan(uuid, timestamptz, text)
  to authenticated;

alter publication supabase_realtime add table public.nfc_tags;
notify pgrst, 'reload schema';

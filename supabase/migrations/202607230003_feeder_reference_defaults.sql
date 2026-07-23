create or replace function public.seed_feeder_reference_data()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.feeder_species (user_id, name)
  select new.user_id, name
  from unnest(array[
    'Discoid Roach', 'House Cricket', 'Banded Cricket', 'Mealworm',
    'Superworm', 'Black Soldier Fly Larva', 'Waxworm', 'Hornworm',
    'Silkworm', 'Blue Bottle Fly', 'Fruit Fly', 'Isopod', 'Springtail'
  ]) as name
  on conflict (user_id, name) do nothing;

  insert into public.feeder_settings (user_id, key, value, label)
  values
    (new.user_id, 'cricket.feeding', 1, 'Cricket feeding'),
    (new.user_id, 'cricket.moisture-added', 1, 'Cricket moisture'),
    (new.user_id, 'cricket.cleaning', 7, 'Cricket cleaning'),
    (new.user_id, 'discoid.feeding', 3, 'Discoid feeding'),
    (new.user_id, 'discoid.moisture-added', 2, 'Discoid moisture'),
    (new.user_id, 'discoid.cleaning', 30, 'Discoid cleaning'),
    (new.user_id, 'fruit-fly.replacement', 21, 'Fruit fly replacement'),
    (new.user_id, 'cricket.incubation', 10, 'Cricket incubation')
  on conflict (user_id, key) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_seed_feeders
  after insert on public.profiles
  for each row execute procedure public.seed_feeder_reference_data();

insert into public.feeder_species (user_id, name)
select profiles.user_id, names.name
from public.profiles
cross join unnest(array[
  'Discoid Roach', 'House Cricket', 'Banded Cricket', 'Mealworm',
  'Superworm', 'Black Soldier Fly Larva', 'Waxworm', 'Hornworm',
  'Silkworm', 'Blue Bottle Fly', 'Fruit Fly', 'Isopod', 'Springtail'
]) as names(name)
on conflict (user_id, name) do nothing;

insert into public.feeder_settings (user_id, key, value, label)
select profiles.user_id, defaults.key, defaults.value, defaults.label
from public.profiles
cross join (values
  ('cricket.feeding', 1, 'Cricket feeding'),
  ('cricket.moisture-added', 1, 'Cricket moisture'),
  ('cricket.cleaning', 7, 'Cricket cleaning'),
  ('discoid.feeding', 3, 'Discoid feeding'),
  ('discoid.moisture-added', 2, 'Discoid moisture'),
  ('discoid.cleaning', 30, 'Discoid cleaning'),
  ('fruit-fly.replacement', 21, 'Fruit fly replacement'),
  ('cricket.incubation', 10, 'Cricket incubation')
) as defaults(key, value, label)
on conflict (user_id, key) do nothing;

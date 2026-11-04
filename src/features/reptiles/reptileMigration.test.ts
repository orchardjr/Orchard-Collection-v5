// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
const owner = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002'
const a = '00000000-0000-4000-8000-000000000011',
  b = '00000000-0000-4000-8000-000000000012'
const migration = readFileSync(
  'supabase/migrations/20261104022008_reptile_collection.sql',
  'utf8',
)
let db: PGlite
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create schema auth;create role authenticated;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  )
  const original = readFileSync(
    'supabase/migrations/202607230001_initial_cloud_schema.sql',
    'utf8',
  )
  await db.exec(
    original.slice(
      original.indexOf('create table public.spaces ('),
      original.indexOf('create table public.plant_media ('),
    ),
  )
  await db.exec(
    original.slice(
      original.indexOf('create or replace function public.set_updated_at()'),
      original.indexOf('create table public.profiles'),
    ),
  )
  await db.exec(
    original
      .slice(
        original.indexOf('do $$\ndeclare table_name text;'),
        original.indexOf('insert into storage.buckets'),
      )
      .replace(
        /array\[[\s\S]*?\]/,
        "array['spaces','plants','tasks','timeline_events']",
      ),
  )
  await db.exec(
    'grant select,insert,update,delete on public.spaces,public.plants,public.tasks,public.timeline_events to authenticated;',
  )
  await db.exec(
    readFileSync(
      'supabase/migrations/202609060001_care_profiles_task_assignments.sql',
      'utf8',
    ),
  )
  await db.exec(migration)
  await db.exec(migration)
  await db.query('insert into auth.users values($1),($2)', [owner, other])
}, 30000)
afterAll(async () => {
  await db?.close()
})
beforeEach(async () => {
  await db.exec(
    'reset role;truncate reptiles,reptile_supplements cascade;set role authenticated;',
  )
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  await db.query(
    "insert into reptiles(id,name,species) values($1,'A','Species'),($2,'B','Species')",
    [a, b],
  )
})
async function routine(
  animal = a,
  frequency = 'days',
  type = 'weigh',
  product: string | null = null,
) {
  const result = await db.query<{ id: string }>(
    "insert into reptile_routines(reptile_id,title,type,frequency,interval_count,starts_at,supplement_id) values($1,'Care',$2,$3,14,now()-interval '1 day',$4) returning id",
    [animal, type, frequency, product],
  )
  return result.rows[0]!.id
}
it('is rerunnable, owner-only and prevents cross-owner references', async () => {
  await routine()
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other])
  expect((await db.query('select * from reptiles')).rows).toHaveLength(0)
  await expect(
    db.query(
      "insert into reptile_events(reptile_id,kind,payload) values($1,'weight','{\"grams\":5}')",
      [a],
    ),
  ).rejects.toThrow()
  expect((await db.query('select * from tasks')).rows).toHaveLength(0)
  const security = await db.query<{ prosecdef: boolean }>(
    "select prosecdef from pg_proc where proname like 'reptile_%'",
  )
  expect(security.rows.every((r) => !r.prosecdef)).toBe(true)
})
it('completes three consecutive recurring tasks atomically without duplicate occurrences', async () => {
  const id = await routine()
  for (let i = 0; i < 3; i++) {
    const current = (
      await db.query<{ id: string }>(
        "select id from tasks where reptile_routine_id=$1 and status='open'",
        [id],
      )
    ).rows[0]!.id
    await db.query('select complete_collection_task($1)', [current])
    await db.query('select complete_collection_task($1)', [current])
    expect(
      (await db.query("select id from tasks where status='open'")).rows,
    ).toHaveLength(1)
  }
  expect((await db.query('select * from tasks')).rows).toHaveLength(4)
  expect(
    (await db.query("select * from reptile_events where kind='task'")).rows,
  ).toHaveLength(3)
})
it('keeps independent animal schedules and creates administration only when explicitly given', async () => {
  const p = (
    await db.query<{ id: string }>(
      "insert into reptile_supplements(name,category,d3) values('Calcium','calcium-d3','yes') returning id",
    )
  ).rows[0]!.id
  const r = await routine(a, 'feeding', 'supplement', p)
  await routine(b, 'days', 'supplement', p)
  await db.query(
    'insert into reptile_events(reptile_id,kind,payload) values($1,\'feeding\',\'{"feeders":[{"type":"Cricket","offered":4,"consumed":3}]}\')',
    [a],
  )
  expect(
    (await db.query("select * from reptile_events where kind='supplement'"))
      .rows,
  ).toHaveLength(0)
  const task = (
    await db.query<{ id: string }>(
      'select id from tasks where reptile_routine_id=$1',
      [r],
    )
  ).rows[0]!.id
  await db.query('select complete_collection_task($1)', [task])
  await db.query('select complete_collection_task($1)', [task])
  const given = await db.query<{ reptile_id: string; payload: { d3: string } }>(
    "select * from reptile_events where kind='supplement'",
  )
  expect(given.rows).toHaveLength(1)
  expect(given.rows[0]!.reptile_id).toBe(a)
  expect(given.rows[0]!.payload.d3).toBe('yes')
  expect(
    (await db.query("select * from tasks where status='open'")).rows,
  ).toHaveLength(1)
})
it('archives schedules and safely deletes dependent rows but preserves shared products and other reptiles', async () => {
  await routine()
  await db.query(
    "insert into reptile_events(reptile_id,kind,payload) values($1,'weight','{\"grams\":6.8}')",
    [a],
  )
  await db.query(
    "update reptiles set status='archived',deleting=true where id=$1",
    [a],
  )
  expect(
    (await db.query("select * from tasks where status='open'")).rows,
  ).toHaveLength(0)
  await db.query('delete from reptiles where id=$1', [a])
  expect((await db.query('select * from reptile_events')).rows).toHaveLength(0)
  expect((await db.query('select * from tasks')).rows).toHaveLength(0)
  expect((await db.query('select * from reptiles')).rows).toHaveLength(1)
})
it('validates weight and feeding records and enforces same-animal photo relationships', async () => {
  await expect(
    db.query(
      "insert into reptile_events(reptile_id,kind,payload) values($1,'weight','{\"grams\":0}')",
      [a],
    ),
  ).rejects.toThrow()
  await expect(
    db.query(
      'insert into reptile_events(reptile_id,kind,payload) values($1,\'feeding\',\'{"feeders":[{"type":"Cricket","offered":2,"consumed":3}]}\')',
      [a],
    ),
  ).rejects.toThrow()
  const event = (
    await db.query<{ id: string }>(
      "insert into reptile_events(reptile_id,kind) values($1,'health') returning id",
      [a],
    )
  ).rows[0]!.id
  await expect(
    db.query(
      "insert into reptile_media(reptile_id,event_id,file_name,storage_path) values($1,$2,'photo',$3)",
      [b, event, `${owner}/reptiles/${b}/original`],
    ),
  ).rejects.toThrow()
})
it('supports weekdays, month-end and explicit custom recurrence dates', async () => {
  const id = await routine()
  await db.query(
    "update reptile_routines set frequency='monthly' where id=$1",
    [id],
  )
  const monthly = await db.query<{ due: Date }>(
    "select reptile_next_due(r,'2026-01-31T10:00Z') as due from reptile_routines r where id=$1",
    [id],
  )
  expect(new Date(monthly.rows[0]!.due).toISOString()).toBe(
    '2026-02-28T10:00:00.000Z',
  )
  await db.query(
    "update reptile_routines set frequency='weekdays',weekdays=array[1,3] where id=$1",
    [id],
  )
  const weekly = await db.query<{ due: Date }>(
    "select reptile_next_due(r,'2026-11-02T10:00Z') as due from reptile_routines r where id=$1",
    [id],
  )
  expect(new Date(weekly.rows[0]!.due).toISOString()).toBe(
    '2026-11-04T10:00:00.000Z',
  )
  await db.query(
    "update reptile_routines set frequency='custom',starts_at='2026-11-01T10:00Z',custom_dates=array['2026-11-03','2026-11-12']::date[] where id=$1",
    [id],
  )
  const custom = await db.query<{ due: Date }>(
    "select reptile_next_due(r,'2026-11-03T10:00Z') as due from reptile_routines r where id=$1",
    [id],
  )
  expect(new Date(custom.rows[0]!.due).toISOString()).toBe(
    '2026-11-12T10:00:00.000Z',
  )
})
it('edits, disables and re-enables a routine without duplicate open tasks', async () => {
  const id = await routine()
  await db.query('update reptile_routines set interval_count=7 where id=$1', [
    id,
  ])
  expect(
    (await db.query("select * from tasks where status='open'")).rows,
  ).toHaveLength(1)
  await db.query('update reptile_routines set enabled=false where id=$1', [id])
  expect(
    (await db.query("select * from tasks where status='open'")).rows,
  ).toHaveLength(0)
  await db.query('update reptile_routines set enabled=true where id=$1', [id])
  await db.query('update reptile_routines set enabled=true where id=$1', [id])
  expect(
    (await db.query("select * from tasks where status='open'")).rows,
  ).toHaveLength(1)
})
it('records missed tasks without recording a supplement as given', async () => {
  const product = (
    await db.query<{ id: string }>(
      "insert into reptile_supplements(name,category,d3) values('Product','other','unknown') returning id",
    )
  ).rows[0]!.id
  await routine(a, 'days', 'supplement', product)
  const task = (
    await db.query<{ id: string }>("select id from tasks where status='open'")
  ).rows[0]!.id
  await db.query("update tasks set status='skipped' where id=$1", [task])
  expect(
    (await db.query("select * from reptile_events where kind='supplement'"))
      .rows,
  ).toHaveLength(0)
  expect(
    (await db.query("select * from tasks where status='open'")).rows,
  ).toHaveLength(1)
  await expect(
    db.query("update tasks set status='open' where id=$1", [task]),
  ).rejects.toThrow('cannot be reopened')
})
it('logs husbandry changes, edits/deletes weights and supports atomic multi-animal assignment', async () => {
  await db.query(
    'update reptiles set husbandry=\'{"unit":"F","ambientTarget":"75"}\' where id=$1',
    [a],
  )
  expect(
    (await db.query("select * from reptile_events where kind='husbandry'"))
      .rows,
  ).toHaveLength(1)
  const weight = (
    await db.query<{ id: string }>(
      "insert into reptile_events(reptile_id,kind,payload) values($1,'weight','{\"grams\":5}') returning id",
      [a],
    )
  ).rows[0]!.id
  await db.query(
    'update reptile_events set payload=\'{"grams":6.8}\' where id=$1',
    [weight],
  )
  expect(
    (
      await db.query<{ grams: string }>(
        "select payload->>'grams' as grams from reptile_events where id=$1",
        [weight],
      )
    ).rows[0]!.grams,
  ).toBe('6.8')
  await db.query('delete from reptile_events where id=$1', [weight])
  const input = {
    title: 'Inspection',
    type: 'inspect',
    frequency: 'once',
    interval_count: 1,
    weekdays: [],
    custom_dates: [],
    starts_at: new Date().toISOString(),
    timezone: 'UTC',
    enabled: true,
  }
  await db.query('select create_reptile_routines($1,$2)', [
    JSON.stringify(input),
    [a, b],
  ])
  expect((await db.query('select * from tasks')).rows).toHaveLength(2)
  await expect(
    db.query('select create_reptile_routines($1,$2)', [
      JSON.stringify(input),
      [a, other],
    ]),
  ).rejects.toThrow()
  expect((await db.query('select * from tasks')).rows).toHaveLength(2)
})
it('rolls back only new reptile data and leaves existing plant data and tasks intact', async () => {
  await routine()
  await db.query(
    "insert into plants(user_id,nickname,scientific_name,kind,status,favorite) values($1,'Existing plant','Plant','plant','active',false)",
    [owner],
  )
  await db.query(
    "insert into tasks(user_id,title,type,status,priority) values($1,'Plant task','custom','open','normal')",
    [owner],
  )
  await db.exec('reset role;')
  await db.exec(readFileSync('docs/reptiles-rollback.sql', 'utf8'))
  expect((await db.query('select * from plants')).rows).toHaveLength(1)
  expect((await db.query('select * from tasks')).rows).toHaveLength(1)
  await db.exec(migration)
})

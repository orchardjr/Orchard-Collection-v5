// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const p1 = '00000000-0000-4000-8000-000000000011'
const p2 = '00000000-0000-4000-8000-000000000012'
const foreign = '00000000-0000-4000-8000-000000000013'
let sql: PGlite

async function rpc(name: string, values: unknown[]) {
  const params = values.map((_, i) => '$' + (i + 1)).join(',')
  const result = await sql.query<{ result: Record<string, unknown> }>(
    `select public.${name}(${params}) as result`,
    values,
  )
  return result.rows[0]!.result
}
const profile = {
  water_interval_days: 7,
  fertilizer_interval_days: 14,
  water_task: true,
  fertilizer_task: false,
  mounted: true,
  moss_pole: true,
  care_notes: 'Keep airy',
  last_watered_at: '2026-01-01T12:00:00Z',
}
const newTask = (ids: string[]) => ({
  title: 'Fertilize orchids',
  type: 'fertilize',
  recurrence: 'weekly',
  status: 'open',
  priority: 'normal',
  plant_ids: ids,
})

describe('care/task PostgreSQL migration', () => {
  it('has the required owner/id unique constraints and invoker-only functions', async () => {
    for (const table of ['plants', 'tasks']) {
      const constraints = await sql.query<{ definition: string }>(
        "select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid=$1::regclass and contype='u'",
        ['public.' + table],
      )
      expect(constraints.rows.map((row) => row.definition)).toContain(
        'UNIQUE (user_id, id)',
      )
    }
    const functions = await sql.query<{
      proname: string
      prosecdef: boolean
      permitted: boolean
    }>(
      "select proname, prosecdef, has_function_privilege('authenticated',oid,'EXECUTE') as permitted from pg_proc where proname in ('collection_task_json','save_collection_task','save_plant_care','complete_collection_task')",
    )
    expect(functions.rows).toHaveLength(4)
    expect(functions.rows.every((row) => !row.prosecdef && row.permitted)).toBe(
      true,
    )
    const task = await rpc('save_collection_task', [newTask([p1]), null])
    expect(
      (
        await sql.query(
          "select public.collection_task_json(t)->>'id' as id from tasks t where id=$1",
          [task.id],
        )
      ).rows,
    ).toEqual([{ id: task.id }])
    await sql.query("select set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ])
    await expect(
      rpc('complete_collection_task', [task.id, 'UTC']),
    ).rejects.toThrow()
    await expect(
      rpc('save_collection_task', [{ title: 'Unauthorized' }, task.id]),
    ).rejects.toThrow()
    expect((await sql.query('select * from task_plants')).rows).toHaveLength(0)
  })

  it('links three consecutive successors to their immediate predecessor', async () => {
    let current = await rpc('save_collection_task', [newTask([p1, p2]), null])
    const chain = [current.id]
    for (let i = 0; i < 3; i++) {
      const completed = await rpc('complete_collection_task', [
        current.id,
        'UTC',
      ])
      await rpc('complete_collection_task', [current.id, 'UTC'])
      const children = await sql.query<{
        id: string
        recurrence_source_id: string
        due_at: Date
      }>(
        'select id, recurrence_source_id, due_at from tasks where recurrence_source_id=$1',
        [current.id],
      )
      expect(children.rows).toHaveLength(1)
      expect(children.rows[0]!.recurrence_source_id).toBe(current.id)
      expect(
        new Date(children.rows[0]!.due_at).getTime() -
          new Date(String(completed.completed_at)).getTime(),
      ).toBe(7 * 86400000)
      current = children.rows[0]!
      chain.push(current.id)
      expect(
        (await sql.query("select id from tasks where status='open'")).rows,
      ).toEqual([{ id: current.id }])
      expect(
        (
          await sql.query(
            'select plant_id from task_plants where task_id=$1 order by plant_id',
            [current.id],
          )
        ).rows,
      ).toEqual([{ plant_id: p1 }, { plant_id: p2 }])
    }
    expect(new Set(chain).size).toBe(4)
    expect(
      (await sql.query("select id from tasks where status='completed'")).rows,
    ).toHaveLength(3)
  })

  it.each(['water', 'fertilize'])(
    'intentionally archives an adopted %s routine on disable, preserving unrelated tasks',
    async (type) => {
      const original = await rpc('save_collection_task', [
        { ...newTask([p1]), type },
        null,
      ])
      const unrelated = await rpc('save_collection_task', [
        { ...newTask([p1]), type, recurrence: 'none' },
        null,
      ])
      const shared = await rpc('save_collection_task', [
        { ...newTask([p1, p2]), type },
        null,
      ])
      const enabled = {
        ...profile,
        water_task: type === 'water',
        fertilizer_task: type === 'fertilize',
      }
      await rpc('save_plant_care', [p1, enabled, 'UTC'])
      expect(
        (
          await sql.query('select care_managed from tasks where id=$1', [
            original.id,
          ])
        ).rows,
      ).toEqual([{ care_managed: true }])
      await rpc('save_plant_care', [
        p1,
        { ...enabled, water_task: false, fertilizer_task: false },
        'UTC',
      ])
      expect(
        (
          await sql.query('select status, title from tasks where id=$1', [
            original.id,
          ])
        ).rows,
      ).toEqual([{ status: 'archived', title: original.title }])
      expect(
        (
          await sql.query<{ id: string }>(
            "select id from tasks where status='open' order by id",
          )
        ).rows
          .map((row) => row.id)
          .sort(),
      ).toEqual([unrelated.id, shared.id].sort())
    },
  )

  it.each(['water', 'fertilize'])(
    'enables, edits, disables and re-enables %s without duplicate open routines',
    async (type) => {
      const enabled = {
        ...profile,
        water_task: type === 'water',
        fertilizer_task: type === 'fertilize',
      }
      const intervalKey =
        type === 'water' ? 'water_interval_days' : 'fertilizer_interval_days'
      await rpc('save_plant_care', [p1, enabled, 'UTC'])
      const first = (await sql.query<{ id: string }>('select id from tasks'))
        .rows[0]!.id
      await rpc('save_plant_care', [
        p1,
        { ...enabled, [intervalKey]: 12 },
        'UTC',
      ])
      expect(
        (await sql.query('select id, recurrence_interval_days from tasks'))
          .rows,
      ).toEqual([{ id: first, recurrence_interval_days: 12 }])
      await rpc('save_plant_care', [
        p1,
        { ...enabled, water_task: false, fertilizer_task: false },
        'UTC',
      ])
      expect(
        (await sql.query("select id from tasks where status='open'")).rows,
      ).toHaveLength(0)
      await rpc('save_plant_care', [p1, enabled, 'UTC'])
      await rpc('save_plant_care', [p1, enabled, 'UTC'])
      expect(
        (
          await sql.query(
            "select id from tasks where status='open' and care_managed",
          )
        ).rows,
      ).toHaveLength(1)
      expect(
        (await sql.query("select id from tasks where status='archived'")).rows,
      ).toEqual([{ id: first }])
    },
  )

  it.each(['water', 'fertilize'])(
    'shared %s completion aligns each plant with its own managed interval',
    async (type) => {
      for (const [plant, days] of [
        [p1, 5],
        [p2, 11],
      ] as const) {
        await rpc('save_plant_care', [
          plant,
          {
            ...profile,
            water_interval_days: days,
            fertilizer_interval_days: days,
            water_task: type === 'water',
            fertilizer_task: type === 'fertilize',
          },
          'UTC',
        ])
      }
      const task = await rpc('save_collection_task', [
        { ...newTask([p1, p2]), type },
        null,
      ])
      const completed = await rpc('complete_collection_task', [task.id, 'UTC'])
      await rpc('complete_collection_task', [task.id, 'UTC'])
      const dateColumn =
        type === 'water' ? 'last_watered_at' : 'last_fertilized_at'
      const rows = (
        await sql.query<{ plant_id: string; care_date: Date; due_at: Date }>(
          `select t.plant_id, p.${dateColumn} as care_date, t.due_at from tasks t join plants p on p.id=t.plant_id where t.care_managed and t.status='open' order by t.plant_id`,
        )
      ).rows
      expect(rows).toHaveLength(2)
      rows.forEach((row, i) => {
        expect(new Date(row.care_date).toISOString()).toBe(
          new Date(String(completed.completed_at)).toISOString(),
        )
        expect(
          new Date(row.due_at).getTime() - new Date(row.care_date).getTime(),
        ).toBe([5, 11][i]! * 86400000)
      })
      expect(
        (
          await sql.query(
            "select id from tasks where not care_managed and status='open'",
          )
        ).rows,
      ).toHaveLength(1)
    },
  )

  it('reruns the migration twice without changing rows or duplicating links or policies', async () => {
    await rpc('save_plant_care', [p1, profile, 'UTC'])
    await rpc('save_collection_task', [newTask([p1, p2]), null])
    const snapshot = async () =>
      (
        await sql.query(
          "select jsonb_build_object('plants',(select jsonb_agg(p order by id) from plants p),'tasks',(select jsonb_agg(t order by id) from tasks t),'links',(select jsonb_agg(a order by task_id,plant_id) from task_plants a)) as state",
        )
      ).rows
    const before = await snapshot()
    for (let i = 0; i < 2; i++) {
      await sql.exec('reset role')
      await sql.exec(
        readFileSync(
          'supabase/migrations/202609060001_care_profiles_task_assignments.sql',
          'utf8',
        ),
      )
      await sql.exec('set role authenticated')
      expect(await snapshot()).toEqual(before)
    }
    expect(
      (
        await sql.query(
          "select policyname from pg_policies where tablename='task_plants'",
        )
      ).rows,
    ).toEqual([{ policyname: 'task_plants_owner' }])
  })

  it('backfills legacy assignments without changing plant or task records', async () => {
    const original = await sql.query<{ id: string }>(
      "insert into tasks(user_id,plant_id,title,priority,status,type,recurrence) values($1,$2,'Legacy','normal','open','water','weekly') returning id",
      [owner, p1],
    )
    const before = (await sql.query('select to_jsonb(t) as task from tasks t'))
      .rows
    await sql.exec('reset role')
    await sql.exec(
      readFileSync(
        'supabase/migrations/202609060001_care_profiles_task_assignments.sql',
        'utf8',
      ),
    )
    await sql.exec('set role authenticated')
    expect(
      (await sql.query('select to_jsonb(t) as task from tasks t')).rows,
    ).toEqual(before)
    expect(
      (await sql.query('select task_id,plant_id from task_plants')).rows,
    ).toEqual([{ task_id: original.rows[0]!.id, plant_id: p1 }])
  })

  it('adopts an existing single-plant routine and advances a managed occurrence once', async () => {
    const existing = await rpc('save_collection_task', [
      { ...newTask([p1]), type: 'water', title: 'Water my orchid' },
      null,
    ])
    await rpc('save_plant_care', [p1, profile, 'UTC'])
    expect(
      (await sql.query('select id, care_managed from tasks')).rows,
    ).toEqual([{ id: existing.id, care_managed: true }])
    await rpc('complete_collection_task', [existing.id, 'UTC'])
    await rpc('complete_collection_task', [existing.id, 'UTC'])
    const tasks = await sql.query<{
      id: string
      recurrence_interval_days: number
    }>(
      "select id, recurrence_interval_days from tasks where care_managed and status='open'",
    )
    expect(tasks.rows).toHaveLength(1)
    const saved = await sql.query<{ last_watered_at: Date }>(
      'select last_watered_at from plants where id=$1',
      [p1],
    )
    await rpc('save_plant_care', [
      p1,
      {
        ...profile,
        water_interval_days: 9,
        last_watered_at: saved.rows[0]!.last_watered_at,
      },
      'UTC',
    ])
    expect(
      (
        await sql.query(
          "select id, recurrence_interval_days from tasks where status='open'",
        )
      ).rows,
    ).toEqual([{ id: tasks.rows[0]!.id, recurrence_interval_days: 9 }])
  })
  beforeAll(async () => {
    sql = new PGlite()
    await sql.exec(`create schema auth; create role authenticated;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public, auth to authenticated;
      grant execute on function auth.uid() to authenticated;`)
    const original = readFileSync(
      'supabase/migrations/202607230001_initial_cloud_schema.sql',
      'utf8',
    )
    await sql.exec(
      original.slice(
        original.indexOf('create table public.spaces ('),
        original.indexOf('create table public.plant_media ('),
      ),
    )
    // Use the actual tracked policy/trigger definitions, scoped to these tables.
    await sql.exec(
      original.slice(
        original.indexOf('create or replace function public.set_updated_at()'),
        original.indexOf('create table public.profiles'),
      ),
    )
    const policies = original.slice(
      original.indexOf('do $$\ndeclare table_name text;'),
      original.indexOf('insert into storage.buckets'),
    )
    await sql.exec(
      policies.replace(
        /array\[[\s\S]*?\]/,
        "array['spaces', 'plants', 'tasks', 'timeline_events']",
      ),
    )
    // Supabase platform table grants are not declared in the initial migration.
    // Model those separately rather than mistaking RLS for a table grant.
    await sql.exec(
      'grant select,insert,update,delete on public.spaces, public.plants, public.tasks, public.timeline_events to authenticated;',
    )
    await sql.exec(
      readFileSync(
        'supabase/migrations/202609060001_care_profiles_task_assignments.sql',
        'utf8',
      ),
    )
  }, 30000)
  afterAll(async () => {
    await sql?.close()
  })
  beforeEach(async () => {
    await sql.exec(`reset role; truncate auth.users cascade; drop trigger if exists fail_completion on public.timeline_events;
      insert into auth.users values ('${owner}'),('${other}');
      insert into public.plants(id,user_id,nickname,scientific_name,kind,status) values
      ('${p1}','${owner}','Cattleya','Cattleya trianae','plant','active'),
      ('${p2}','${owner}','Dendrobium','Dendrobium anosmum','plant','active'),
      ('${foreign}','${other}','Private','Private plant','plant','active');
      set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`)
  })

  it('saves care and updates one recurring task instead of duplicating it', async () => {
    const plant = await rpc('save_plant_care', [p1, profile, 'UTC'])
    expect(plant.care_notes).toBe('Keep airy')
    expect(plant.mounted).toBe(true)
    const first = await sql.query<{ id: string; due_at: Date }>(
      'select id,due_at from tasks',
    )
    expect(first.rows).toHaveLength(1)
    expect(new Date(first.rows[0]!.due_at).toISOString()).toBe(
      '2026-01-08T12:00:00.000Z',
    )
    await rpc('save_plant_care', [
      p1,
      { ...profile, water_interval_days: 10 },
      'UTC',
    ])
    const changed = await sql.query<{
      id: string
      recurrence_interval_days: number
    }>('select id,recurrence_interval_days from tasks')
    expect(changed.rows).toEqual([
      { id: first.rows[0]!.id, recurrence_interval_days: 10 },
    ])
    await rpc('save_collection_task', [
      { ...newTask([p1]), recurrence: 'none' },
      null,
    ])
    await rpc('save_plant_care', [p1, { ...profile, water_task: false }, 'UTC'])
    expect(
      (
        await sql.query(
          "select * from tasks where status='open' and not care_managed",
        )
      ).rows,
    ).toHaveLength(1)
  })

  it('completes a shared task atomically and advances all assigned care dates exactly once', async () => {
    const task = await rpc('save_collection_task', [newTask([p1, p2]), null])
    expect(task.plant_ids).toEqual([p1, p2])
    expect((await sql.query('select * from tasks')).rows).toHaveLength(1)
    const complete = await rpc('complete_collection_task', [task.id, 'UTC'])
    await rpc('complete_collection_task', [task.id, 'UTC'])
    const dates = await sql.query<{ last_fertilized_at: Date }>(
      'select last_fertilized_at from plants order by id',
    )
    expect(
      dates.rows.map((p) => new Date(p.last_fertilized_at).toISOString()),
    ).toEqual(
      [complete.completed_at, complete.completed_at].map((date) =>
        new Date(String(date)).toISOString(),
      ),
    )
    expect((await sql.query('select * from tasks')).rows).toHaveLength(2)
    const next = await sql.query<{ difference: number }>(
      "select extract(epoch from due_at - $1::timestamptz)::int as difference from tasks where status='open'",
      [complete.completed_at],
    )
    expect(next.rows[0]!.difference).toBe(7 * 86400)
    expect((await sql.query('select * from task_plants')).rows).toHaveLength(4)
  })

  it('keeps profile due dates aligned when an ordinary watering task is completed', async () => {
    await rpc('save_plant_care', [p1, profile, 'America/Toronto'])
    const task = await rpc('save_collection_task', [
      { ...newTask([p1]), type: 'water', recurrence: 'none' },
      null,
    ])
    await rpc('complete_collection_task', [task.id, 'America/Toronto'])
    const result = await sql.query<{ matches: boolean }>(
      "select t.due_at = p.last_watered_at + interval '7 days' as matches from tasks t join plants p on p.id=t.plant_id where t.care_managed and t.status='open'",
    )
    expect(result.rows[0]!.matches).toBe(true)
  })

  it('rolls back completion, next occurrence and care dates on any dependent failure', async () => {
    const task = await rpc('save_collection_task', [newTask([p1, p2]), null])
    await sql.exec(`reset role; create or replace function public.reject_completion() returns trigger language plpgsql as $$ begin if new.title='Task completed' then raise exception 'test failure'; end if; return new; end $$;
      create trigger fail_completion before insert on public.timeline_events for each row execute function public.reject_completion(); set role authenticated;`)
    await expect(
      rpc('complete_collection_task', [task.id, 'UTC']),
    ).rejects.toThrow('test failure')
    expect(
      (await sql.query<{ status: string }>('select status from tasks')).rows,
    ).toEqual([{ status: 'open' }])
    expect(
      (
        await sql.query(
          'select * from plants where last_fertilized_at is not null',
        )
      ).rows,
    ).toHaveLength(0)
  })

  it('enforces ownership for assignments and care edits without partial writes', async () => {
    await expect(
      rpc('save_collection_task', [newTask([p1, foreign]), null]),
    ).rejects.toThrow(/assigned plant/)
    await expect(
      rpc('save_plant_care', [foreign, profile, 'UTC']),
    ).rejects.toThrow()
    expect((await sql.query('select * from tasks')).rows).toHaveLength(0)
  })

  it('preserves a shared task when one assigned plant is removed', async () => {
    const task = await rpc('save_collection_task', [newTask([p1, p2]), null])
    await sql.query('delete from plants where id=$1', [p1])
    expect((await sql.query('select id from tasks')).rows).toEqual([
      { id: task.id },
    ])
    expect((await sql.query('select plant_id from task_plants')).rows).toEqual([
      { plant_id: p2 },
    ])
  })
})

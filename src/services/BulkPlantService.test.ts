import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import {
  plantRepository,
  spaceRepository,
  taskRepository,
} from '../db/repositories'
import { BulkPlantService, validateBulkPlantChanges } from './BulkPlantService'
import { taskService } from './TaskService'
import { plantTagService } from './PlantTagService'

const service = new BulkPlantService()
const makePlant = (nickname: string) =>
  plantRepository.create({
    nickname,
    scientificName: nickname,
    kind: 'plant',
    status: 'active',
    favorite: false,
    waterIntervalDays: 7,
    fertilizerIntervalDays: 14,
    mounted: true,
    mossPole: true,
    careNotes: nickname + ' care',
    lastWateredAt: new Date('2026-01-01'),
    lastFertilizedAt: new Date('2026-01-02'),
  })
beforeEach(async () => {
  await Promise.all([
    db.plants.clear(),
    db.tasks.clear(),
    db.spaces.clear(),
    db.timeline.clear(),
  ])
})
afterEach(() => vi.restoreAllMocks())
describe('bulk plant editing', () => {
  it('moves only selected plants, supports clear location, and records moves', async () => {
    const a = await makePlant('A'),
      b = await makePlant('B'),
      c = await makePlant('C')
    const space = await spaceRepository.create({ name: 'Shelf', type: 'shelf' })
    const result = await service.apply([a.id, b.id, a.id], {
      spaceId: space.id,
    })
    expect(result.succeeded).toEqual([a.id, b.id])
    expect(result.failed).toEqual([])
    expect((await plantRepository.getById(a.id))?.spaceId).toBe(space.id)
    expect((await plantRepository.getById(c.id))?.spaceId).toBeUndefined()
    expect(await db.timeline.count()).toBe(2)
    await service.apply([a.id], { spaceId: null })
    expect((await plantRepository.getById(a.id))?.spaceId).toBeUndefined()
    expect((await plantRepository.getById(b.id))?.spaceId).toBe(space.id)
  })
  it('preserves each plant’s history, notes, other interval, and task choices', async () => {
    const a = await makePlant('A'),
      b = await makePlant('B')
    await taskService.saveCare(a.id, {
      ...a,
      waterTask: true,
      fertilizerTask: false,
    })
    const userTask = await taskService.create({
      title: 'Water my way',
      type: 'water',
      plantId: b.id,
      status: 'open',
      priority: 'normal',
      recurrence: 'weekly',
    })
    await service.apply([a.id, b.id], { waterIntervalDays: 10 })
    for (const original of [a, b]) {
      expect(await plantRepository.getById(original.id)).toMatchObject({
        waterIntervalDays: 10,
        fertilizerIntervalDays: 14,
        careNotes: original.careNotes,
        lastWateredAt: original.lastWateredAt,
        lastFertilizedAt: original.lastFertilizedAt,
        mounted: true,
        mossPole: true,
      })
    }
    expect(
      (await taskRepository.getByPlantId(a.id)).filter(
        (t) => t.status === 'open',
      ),
    ).toHaveLength(1)
    expect((await taskRepository.getByPlantId(a.id))[0]).toMatchObject({
      careManaged: true,
      recurrenceIntervalDays: 10,
    })
    expect(await taskRepository.getById(userTask.id)).toMatchObject({
      recurrence: 'weekly',
      status: 'open',
    })
    expect(await db.tasks.count()).toBe(2)
    await service.apply([a.id, b.id], { waterIntervalDays: 10 })
    expect(await db.tasks.count()).toBe(2)
  })
  it('disables only care-managed tasks and preserves unrelated recurring tasks', async () => {
    const p = await makePlant('A')
    await taskService.saveCare(p.id, {
      ...p,
      waterTask: true,
      fertilizerTask: true,
    })
    const user = await taskService.create({
      title: 'My task',
      type: 'water',
      plantId: p.id,
      status: 'open',
      priority: 'normal',
      recurrence: 'weekly',
    })
    await service.apply([p.id], { waterIntervalDays: 0 })
    const tasks = await taskRepository.getByPlantId(p.id)
    expect(
      tasks.find((task) => task.careManaged && task.type === 'water')?.status,
    ).toBe('archived')
    expect(tasks.find((task) => task.type === 'fertilize')?.status).toBe('open')
    expect(tasks.find((task) => task.id === user.id)?.status).toBe('open')
    expect((await plantRepository.getById(p.id))?.waterIntervalDays).toBe(0)
  })
  it('reports partial saves truthfully, continues the batch, and supports idempotent retry', async () => {
    const a = await makePlant('A'),
      b = await makePlant('B')
    const update = vi
      .fn()
      .mockRejectedValueOnce(new Error('tag insert [42501] denied'))
      .mockResolvedValue(undefined)
    vi.spyOn(plantTagService, 'prepare').mockResolvedValue(update)
    const result = await service.apply([a.id, b.id, 'missing'], {
      addTags: [' Orchid ', 'Orchid'],
      waterIntervalDays: 9,
    })
    expect(result.succeeded).toEqual([b.id])
    expect(result.failed.map((item) => item.id)).toEqual([a.id, 'missing'])
    expect(result.failed[0]?.message).toContain('[42501]')
    expect((await plantRepository.getById(a.id))?.waterIntervalDays).toBe(9)
    expect(
      await service.apply([a.id], {
        addTags: ['Orchid'],
        waterIntervalDays: 9,
      }),
    ).toEqual({ succeeded: [a.id], failed: [] })
    expect(await db.tasks.count()).toBe(0)
  })
  it('rejects missing or archived locations before changing anything', async () => {
    const p = await makePlant('A')
    const space = await spaceRepository.create({
      name: 'Old',
      type: 'shelf',
      archivedAt: new Date(),
    })
    await expect(
      service.apply([p.id], { spaceId: space.id, waterIntervalDays: 8 }),
    ).rejects.toThrow('active space')
    await expect(service.apply([p.id], { spaceId: 'missing' })).rejects.toThrow(
      'active space',
    )
    expect((await plantRepository.getById(p.id))?.waterIntervalDays).toBe(7)
  })
  it.each([
    {},
    { waterIntervalDays: -1 },
    { fertilizerIntervalDays: 3651 },
    { waterIntervalDays: 1.5 },
    { waterIntervalDays: NaN },
    { spaceId: '' },
    { addTags: ['Orchid'], removeTags: [' Orchid '] },
  ])('rejects invalid or empty edits %j', (changes) => {
    expect(() => validateBulkPlantChanges(changes)).toThrow()
  })
  it('does not implicitly restore explicitly selected archived plants', async () => {
    const p = await makePlant('A')
    await plantRepository.update(p.id, { status: 'archived' })
    await service.apply([p.id], { fertilizerIntervalDays: 21 })
    expect(await plantRepository.getById(p.id)).toMatchObject({
      status: 'archived',
      fertilizerIntervalDays: 21,
    })
  })
})

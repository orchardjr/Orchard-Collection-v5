import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/database'
import {
  plantRepository,
  taskRepository,
  timelineRepository,
} from '../db/repositories'
import { TaskService } from './TaskService'
import {
  careNextDue,
  assignedPlantIds,
  nextDueDate,
} from '../features/tasks/taskScheduling'
const service = new TaskService()
const profile = {
  waterIntervalDays: 7,
  fertilizerIntervalDays: 14,
  waterTask: true,
  fertilizerTask: false,
  mounted: true,
  mossPole: false,
  careNotes: 'Airy roots',
  lastWateredAt: new Date('2026-01-01T12:00:00Z'),
}
async function makePlant(name: string) {
  return plantRepository.create({
    nickname: name,
    scientificName: name,
    kind: 'plant',
    status: 'active',
    favorite: false,
  })
}
beforeEach(async () => {
  await Promise.all([db.plants.clear(), db.tasks.clear(), db.timeline.clear()])
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})
describe('care profiles and shared tasks', () => {
  it('adopts an existing single-plant recurring care task and leaves shared tasks alone', async () => {
    const a = await makePlant('A'),
      b = await makePlant('B')
    const existing = await service.create({
      title: 'My watering routine',
      type: 'water',
      plantId: a.id,
      status: 'open',
      priority: 'high',
      recurrence: 'weekly',
      dueAt: new Date(),
    })
    const shared = await service.create({
      title: 'Water shared',
      type: 'water',
      plantIds: [a.id, b.id],
      status: 'open',
      priority: 'normal',
      recurrence: 'weekly',
      dueAt: new Date(),
    })
    await service.saveCare(a.id, profile)
    expect(await db.tasks.count()).toBe(2)
    expect(await taskRepository.getById(existing.id)).toMatchObject({
      title: 'My watering routine',
      careManaged: true,
      priority: 'high',
      recurrenceIntervalDays: 7,
    })
    expect((await taskRepository.getById(shared.id))?.careManaged).not.toBe(
      true,
    )
  })
  it('saves a profile and updates its one recurring task when interval changes', async () => {
    const plant = await makePlant('Fern')
    await service.saveCare(plant.id, profile)
    const first = (await db.tasks.toArray())[0]!
    expect(first.dueAt).toEqual(new Date('2026-01-08T12:00:00Z'))
    expect((await plantRepository.getById(plant.id))?.careNotes).toBe(
      'Airy roots',
    )
    await service.saveCare(plant.id, { ...profile, waterIntervalDays: 10 })
    const tasks = await db.tasks.toArray()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.id).toBe(first.id)
    expect(tasks[0]?.recurrenceIntervalDays).toBe(10)
    const unrelated = await service.create({
      title: 'Repot',
      type: 'repot',
      plantId: plant.id,
      status: 'open',
      priority: 'normal',
    })
    await service.saveCare(plant.id, { ...profile, waterTask: false })
    expect((await taskRepository.getById(first.id))?.status).toBe('archived')
    expect((await taskRepository.getById(unrelated.id))?.status).toBe('open')
  })
  it('calculates care dates and clamps monthly recurrence at month end', () => {
    expect(careNextDue(new Date(2026, 0, 30), 7)).toEqual(new Date(2026, 1, 6))
    expect(careNextDue(undefined, 7)).toBeUndefined()
    expect(careNextDue(new Date(), 0)).toBeUndefined()
    expect(
      nextDueDate({
        recurrence: 'monthly',
        dueAt: new Date(2026, 0, 31),
      } as Parameters<typeof nextDueDate>[0]),
    ).toEqual(new Date(2026, 1, 28))
  })
  it('creates one task for multiple plants and completion updates all care dates exactly once', async () => {
    const a = await makePlant('A'),
      b = await makePlant('B')
    await service.saveCare(a.id, profile)
    await service.saveCare(b.id, profile)
    const task = await service.create({
      title: 'Water both',
      type: 'water',
      plantIds: [a.id, b.id, a.id],
      status: 'open',
      priority: 'normal',
      recurrence: 'weekly',
      dueAt: new Date('2026-01-01'),
    })
    expect(assignedPlantIds(task)).toEqual([a.id, b.id])
    expect(await taskRepository.getByPlantId(b.id)).toHaveLength(2)
    await service.complete(task.id)
    const completed = await taskRepository.getById(task.id)
    await service.complete(task.id)
    for (const id of [a.id, b.id]) {
      const plant = await plantRepository.getById(id)
      expect(plant?.lastWateredAt).toEqual(completed?.completedAt)
      const routine = (await taskRepository.getByPlantId(id)).find(
        (t) => t.careManaged && t.status === 'open',
      )
      expect(routine?.dueAt).toEqual(careNextDue(completed?.completedAt, 7))
    }
    expect(
      (await db.tasks.toArray()).filter(
        (t) => t.recurrenceSourceId === task.id,
      ),
    ).toHaveLength(1)
    expect(
      (await timelineRepository.getByPlantId(a.id)).filter(
        (e) => e.title === 'Task completed',
      ),
    ).toHaveLength(1)
  })
  it('preserves completed care history and schedules a managed successor without duplicates', async () => {
    const plant = await makePlant('Fern')
    await service.saveCare(plant.id, profile)
    const task = (await db.tasks.toArray())[0]!
    await service.complete(task.id)
    await service.saveCare(plant.id, {
      ...profile,
      lastWateredAt: (await plantRepository.getById(plant.id))?.lastWateredAt,
      waterIntervalDays: 12,
    })
    const tasks = await db.tasks.toArray()
    expect(tasks.filter((t) => t.status === 'open')).toHaveLength(1)
    expect(tasks.find((t) => t.status === 'open')?.recurrenceIntervalDays).toBe(
      12,
    )
    expect(tasks.find((t) => t.id === task.id)?.status).toBe('completed')
  })
  it('rolls back care dates and all task writes if completion fails', async () => {
    const plant = await makePlant('Fern')
    const task = await service.create({
      title: 'Fertilize',
      type: 'fertilize',
      plantId: plant.id,
      status: 'open',
      priority: 'normal',
      recurrence: 'weekly',
      dueAt: new Date(),
    })
    vi.spyOn(timelineRepository, 'create').mockRejectedValueOnce(
      new Error('Timeline unavailable'),
    )
    await expect(service.complete(task.id)).rejects.toThrow(
      'Timeline unavailable',
    )
    expect((await taskRepository.getById(task.id))?.status).toBe('open')
    expect(
      (await plantRepository.getById(plant.id))?.lastFertilizedAt,
    ).toBeUndefined()
    expect(await db.tasks.count()).toBe(1)
  })
  it('keeps shared tasks when one plant is permanently removed', async () => {
    const a = await makePlant('A'),
      b = await makePlant('B')
    const task = await service.create({
      title: 'Inspect both',
      type: 'inspect',
      plantIds: [a.id, b.id],
      status: 'open',
      priority: 'normal',
    })
    await plantRepository.deletePermanently(a.id)
    expect(assignedPlantIds((await taskRepository.getById(task.id))!)).toEqual([
      b.id,
    ])
  })
})

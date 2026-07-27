import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { taskRepository, timelineRepository } from '../db/repositories'
import { TaskService, nextDueDate } from './TaskService'
const service = new TaskService()
const base = {
  title: 'Water fern',
  type: 'water' as const,
  priority: 'normal' as const,
  status: 'open' as const,
  recurrence: 'none' as const,
}
describe('TaskService', () => {
  beforeEach(async () => {
    await Promise.all([db.tasks.clear(), db.timeline.clear()])
  })
  it('supports CRUD and lifecycle selectors', async () => {
    const overdue = await service.create({
      ...base,
      dueAt: new Date('2026-07-19T10:00:00'),
    })
    const today = await service.create({
      ...base,
      title: 'Today',
      dueAt: new Date('2026-07-20T10:00:00'),
    })
    expect(
      await taskRepository.getOverdue(new Date('2026-07-20T09:00:00')),
    ).toHaveLength(1)
    expect(
      await taskRepository.getDueToday(new Date('2026-07-20T09:00:00')),
    ).toHaveLength(1)
    await service.complete(overdue.id)
    expect((await taskRepository.getById(overdue.id))?.status).toBe('completed')
    await service.reopen(overdue.id)
    expect((await taskRepository.getById(overdue.id))?.status).toBe('open')
    await service.skip(today.id)
    expect((await taskRepository.getById(today.id))?.status).toBe('skipped')
  })
  it('creates exactly one next recurring occurrence', async () => {
    const task = await service.create({
      ...base,
      recurrence: 'weekly',
      dueAt: new Date('2026-07-20T10:00:00'),
    })
    expect(nextDueDate(task)?.toISOString()).toBe(
      new Date('2026-07-27T10:00:00').toISOString(),
    )
    await service.complete(task.id)
    await service.complete(task.id)
    expect(
      await db.tasks.where('recurrenceSourceId').equals(task.id).count(),
    ).toBe(1)
  })
  it('filters by plant and space and emits plant timeline events', async () => {
    const task = await service.create({ ...base, plantId: 'p1', spaceId: 's1' })
    expect(await taskRepository.getByPlantId('p1')).toHaveLength(1)
    expect(await taskRepository.getBySpaceId('s1')).toHaveLength(1)
    await service.complete(task.id)
    expect(
      (await timelineRepository.getByPlantId('p1')).map((e) => e.title),
    ).toContain('Task completed')
  })
})

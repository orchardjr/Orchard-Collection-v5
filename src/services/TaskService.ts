import { db } from '../db/database'
import type { CreateInput, UpdateInput } from '../db/repositories'
import {
  plantRepository,
  taskRepository,
  timelineRepository,
} from '../db/repositories'
import type { Plant, Task } from '../models'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import {
  assertOnline,
  fromSupabaseRow,
  toSupabaseRow,
} from '../data/SupabaseRepository'
import { formatSupabaseErrorDetails } from '../data/supabaseErrorDetails'
import {
  assignedPlantIds,
  careNextDue,
  nextDueDate,
  validateCare,
  type CareProfileInput,
} from '../features/tasks/taskScheduling'

export { nextDueDate } from '../features/tasks/taskScheduling'

export async function taskRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  assertOnline()
  const { data, error } = await requireSupabase().rpc(name, args)
  if (error)
    throw new Error(
      `Could not save care or task changes. ${formatSupabaseErrorDetails(error)}`,
      { cause: error },
    )
  return fromSupabaseRow<T>(data)
}

export class TaskService {
  async create(input: CreateInput<Task>) {
    const ids = assignedPlantIds(input)
    const value = {
      ...input,
      plantIds: ids,
      plantId: ids.length === 1 ? ids[0] : undefined,
    }
    if (isSupabaseConfigured) return taskRepository.create(value)
    return db.transaction('rw', db.tasks, db.timeline, async () => {
      const task = await taskRepository.create(value)
      await this.event(task, 'Task created')
      return task
    })
  }

  async update(id: string, input: UpdateInput<Task>) {
    const current = await taskRepository.getById(id)
    if (current?.careManaged)
      throw new Error('Edit this recurring routine from the plant’s Care tab.')
    const combined = { ...current, ...input }
    const ids = assignedPlantIds(combined)
    return taskRepository.update(id, {
      ...input,
      plantIds: ids,
      plantId: ids.length === 1 ? ids[0] : undefined,
    })
  }

  async saveCare(id: string, input: CareProfileInput): Promise<Plant> {
    validateCare(input)
    if (isSupabaseConfigured)
      return taskRpc<Plant>('save_plant_care', {
        target_plant_id: id,
        profile: toSupabaseRow(input),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    return db.transaction('rw', db.plants, db.tasks, async () => {
      const { waterTask, fertilizerTask, ...fields } = input
      const plant = await plantRepository.update(id, fields)
      if (!plant) throw new Error('Plant not found.')
      for (const type of ['water', 'fertilize'] as const) {
        const interval =
          type === 'water'
            ? input.waterIntervalDays
            : input.fertilizerIntervalDays
        const enabled = type === 'water' ? waterTask : fertilizerTask
        const last =
          type === 'water' ? input.lastWateredAt : input.lastFertilizedAt
        const candidates = await taskRepository.getByPlantId(id)
        const managed = candidates.find(
          (t) => t.careManaged && t.type === type && t.status === 'open',
        )
        const existing =
          managed ??
          (enabled && interval
            ? candidates.find(
                (t) =>
                  t.type === type &&
                  t.status === 'open' &&
                  t.recurrence &&
                  t.recurrence !== 'none' &&
                  assignedPlantIds(t).length === 1,
              )
            : undefined)
        if (!enabled || !interval) {
          if (existing)
            await taskRepository.update(existing.id, {
              status: 'archived',
              archivedAt: new Date(),
            })
          continue
        }
        const task: CreateInput<Task> = {
          title: existing?.title ?? (type === 'water' ? 'Water' : 'Fertilize'),
          type,
          plantId: id,
          plantIds: [id],
          careManaged: true,
          status: 'open',
          priority: existing?.priority ?? 'normal',
          recurrence: 'interval',
          recurrenceIntervalDays: interval,
          dueAt: careNextDue(
            last ?? existing?.createdAt ?? new Date(),
            interval,
          ),
        }
        if (existing) await taskRepository.update(existing.id, task)
        else await taskRepository.create(task)
      }
      return plant
    })
  }

  async complete(id: string) {
    if (isSupabaseConfigured)
      return taskRpc<Task>('complete_collection_task', {
        target_task_id: id,
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    return db.transaction('rw', db.tasks, db.timeline, db.plants, async () => {
      const task = await taskRepository.getById(id)
      if (!task || task.status !== 'open') return task
      const now = new Date()
      const completed = await taskRepository.update(id, {
        status: 'completed',
        completedAt: now,
      })
      const nextDue = nextDueDate(task, now)
      if (
        nextDue &&
        !(await taskRepository.getAll()).some(
          (t) => t.recurrenceSourceId === id,
        )
      ) {
        await taskRepository.create({
          title: task.title,
          description: task.description,
          plantId: task.plantId,
          plantIds: assignedPlantIds(task),
          spaceId: task.spaceId,
          type: task.type,
          priority: task.priority,
          careManaged: task.careManaged,
          recurrence: task.recurrence,
          recurrenceIntervalDays: task.recurrenceIntervalDays,
          dueAt: nextDue,
          status: 'open',
          recurrenceSourceId: id,
        })
      }
      for (const plantId of assignedPlantIds(task)) {
        if (task.type === 'water' || task.type === 'fertilize') {
          const plant = await plantRepository.update(
            plantId,
            task.type === 'water'
              ? { lastWateredAt: now }
              : { lastFertilizedAt: now },
          )
          const days =
            task.type === 'water'
              ? plant?.waterIntervalDays
              : plant?.fertilizerIntervalDays
          const due = careNextDue(now, days)
          if (due)
            for (const routine of await taskRepository.getByPlantId(plantId)) {
              if (
                routine.careManaged &&
                routine.type === task.type &&
                routine.status === 'open'
              )
                await taskRepository.update(routine.id, { dueAt: due })
            }
        }
      }
      if (completed) await this.event(completed, 'Task completed')
      return completed
    })
  }

  async reopen(id: string) {
    const task = await taskRepository.getById(id)
    if (task?.careManaged || (task?.recurrence && task.recurrence !== 'none'))
      throw new Error(
        'Recurring completions are kept as history. Use the next scheduled task.',
      )
    return this.status(id, 'open', 'Task reopened')
  }
  async skip(id: string) {
    return this.status(id, 'skipped', 'Task skipped')
  }
  async archive(id: string) {
    const task = await taskRepository.getById(id)
    if (task?.careManaged)
      throw new Error(
        'Disable this recurring routine from the plant’s Care tab.',
      )
    return taskRepository.update(id, {
      status: 'archived',
      archivedAt: new Date(),
    })
  }
  private async status(id: string, status: Task['status'], title: string) {
    const operation = async () => {
      const current = await taskRepository.getById(id)
      if (current?.careManaged)
        throw new Error(
          'Manage this recurring routine from the plant’s Care tab.',
        )
      const task = await taskRepository.update(id, {
        status,
        completedAt: undefined,
      })
      if (task) await this.event(task, title)
      return task
    }
    return isSupabaseConfigured
      ? operation()
      : db.transaction('rw', db.tasks, db.timeline, operation)
  }
  private async event(task: Task, title: string) {
    for (const plantId of assignedPlantIds(task))
      await timelineRepository.create({
        plantId,
        spaceId: task.spaceId,
        title,
        description: task.title,
        eventType: 'task',
        occurredAt: new Date(),
        metadata: { taskId: task.id },
      })
  }
}
export const taskService = new TaskService()

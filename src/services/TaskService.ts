import { db } from '../db/database'
import type { CreateInput, UpdateInput } from '../db/repositories'
import { taskRepository, timelineRepository } from '../db/repositories'
import type { Task } from '../models'
import { isSupabaseConfigured } from '../lib/supabase'

export function nextDueDate(task: Task): Date | undefined {
  if (!task.dueAt || !task.recurrence || task.recurrence === 'none')
    return undefined
  const next = new Date(task.dueAt)
  const days =
    task.recurrence === 'daily'
      ? 1
      : task.recurrence === 'weekly'
        ? 7
        : Math.max(1, task.recurrenceIntervalDays ?? 1)
  next.setDate(next.getDate() + days)
  return next
}

export class TaskService {
  async create(input: CreateInput<Task>) {
    const operation = async () => {
      const task = await taskRepository.create(input)
      if (task.plantId) await this.event(task, 'Task created')
      return task
    }
    return isSupabaseConfigured
      ? operation()
      : db.transaction('rw', db.tasks, db.timeline, operation)
  }

  update(id: string, input: UpdateInput<Task>) {
    return taskRepository.update(id, input)
  }

  async complete(id: string) {
    const operation = async () => {
      const task = await taskRepository.getById(id)
      if (!task) return undefined
      const completed = await taskRepository.update(id, {
        status: 'completed',
        completedAt: new Date(),
      })
      const nextDue = nextDueDate(task)
      if (nextDue) {
        const duplicate = (await taskRepository.getAll()).find(
          (candidate) => candidate.recurrenceSourceId === task.id,
        )
        if (!duplicate)
          await taskRepository.create({
            ...this.copy(task),
            dueAt: nextDue,
            status: 'open',
            recurrenceSourceId: task.id,
          })
      }
      if (completed?.plantId) await this.event(completed, 'Task completed')
      return completed
    }
    return isSupabaseConfigured
      ? operation()
      : db.transaction('rw', db.tasks, db.timeline, operation)
  }

  async reopen(id: string) {
    return this.status(id, 'open', 'Task reopened')
  }
  async skip(id: string) {
    return this.status(id, 'skipped', 'Task skipped')
  }
  async archive(id: string) {
    return taskRepository.update(id, {
      status: 'archived',
      archivedAt: new Date(),
    })
  }

  private async status(id: string, status: Task['status'], title: string) {
    const operation = async () => {
      const task = await taskRepository.update(id, {
        status,
        completedAt: undefined,
      })
      if (task?.plantId) await this.event(task, title)
      return task
    }
    return isSupabaseConfigured
      ? operation()
      : db.transaction('rw', db.tasks, db.timeline, operation)
  }

  private copy(task: Task): CreateInput<Task> {
    return {
      title: task.title,
      description: task.description,
      plantId: task.plantId,
      spaceId: task.spaceId,
      type: task.type,
      dueAt: task.dueAt,
      status: 'open',
      priority: task.priority,
      recurrence: task.recurrence,
      recurrenceIntervalDays: task.recurrenceIntervalDays,
    }
  }

  private async event(task: Task, title: string) {
    await timelineRepository.create({
      plantId: task.plantId,
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

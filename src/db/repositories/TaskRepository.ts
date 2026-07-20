import type { Task } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(db.tasks)
  }

  getOpen(): Promise<Task[]> {
    return db.tasks.where('status').equals('open').toArray()
  }
  getByPlantId(id: string): Promise<Task[]> {
    return db.tasks.where('plantId').equals(id).toArray()
  }
  getBySpaceId(id: string): Promise<Task[]> {
    return db.tasks.where('spaceId').equals(id).toArray()
  }
  async getDueToday(now = new Date()) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return db.tasks
      .where('dueAt')
      .between(start, end, true, false)
      .and((task) => task.status === 'open')
      .toArray()
  }
  getOverdue(now = new Date()) {
    return db.tasks
      .where('dueAt')
      .below(now)
      .and((task) => task.status === 'open')
      .toArray()
  }
  async getUpcoming(now = new Date()) {
    const end = new Date(now)
    end.setDate(end.getDate() + 30)
    return db.tasks
      .where('dueAt')
      .between(now, end, true, true)
      .and((task) => task.status === 'open')
      .toArray()
  }
}

export const taskRepository = new TaskRepository()

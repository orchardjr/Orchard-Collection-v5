import type { Task } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class TaskRepository extends BaseRepository<Task> {
  constructor() {
    super(db.tasks)
  }
}

export const taskRepository = new TaskRepository()

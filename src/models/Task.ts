import type { BaseRecord } from './BaseRecord'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in-progress' | 'completed'

export interface Task extends BaseRecord {
  plantId?: string
  title: string
  description?: string
  dueAt?: Date
  priority: TaskPriority
  status: TaskStatus
  completedAt?: Date
}

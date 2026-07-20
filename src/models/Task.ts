import type { BaseRecord } from './BaseRecord'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'open' | 'completed' | 'skipped' | 'archived'
export type TaskType =
  | 'water'
  | 'fertilize'
  | 'repot'
  | 'inspect'
  | 'photograph'
  | 'prune'
  | 'treat'
  | 'custom'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'interval'

export interface Task extends BaseRecord {
  plantId?: string
  spaceId?: string
  title: string
  description?: string
  dueAt?: Date
  priority: TaskPriority
  status: TaskStatus
  type: TaskType
  recurrence?: TaskRecurrence
  recurrenceIntervalDays?: number
  recurrenceSourceId?: string
  completedAt?: Date
  archivedAt?: Date
}

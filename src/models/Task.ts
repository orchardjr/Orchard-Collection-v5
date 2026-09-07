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
  | 'propagate'
  | 'rotate'
  | 'moss-pole'
  | 'custom'
export type TaskRecurrence =
  'none' | 'daily' | 'weekly' | 'interval' | 'monthly'

export interface Task extends BaseRecord {
  plantId?: string
  plantIds?: string[]
  careManaged?: boolean
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

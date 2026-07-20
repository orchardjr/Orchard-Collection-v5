import type { BaseRecord } from './BaseRecord'

export type TimelineEventType =
  | 'acquired'
  | 'care'
  | 'growth'
  | 'media'
  | 'note'
  | 'moved'
  | 'task'
  | 'observation'

export interface TimelineEvent extends BaseRecord {
  plantId?: string
  spaceId?: string
  title: string
  description?: string
  eventType: TimelineEventType
  occurredAt: Date
  metadata?: Record<string, string | number | boolean>
  isManual?: boolean
}

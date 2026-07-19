import type { BaseRecord } from './BaseRecord'

export type TimelineEventType =
  'acquired' | 'care' | 'growth' | 'media' | 'note' | 'moved'

export interface TimelineEvent extends BaseRecord {
  plantId?: string
  title: string
  description?: string
  eventType: TimelineEventType
  occurredAt: Date
  metadata?: Record<string, string | number | boolean>
}

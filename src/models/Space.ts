import type { BaseRecord } from './BaseRecord'

export type SpaceType =
  | 'room'
  | 'plant-room'
  | 'greenhouse'
  | 'cabinet'
  | 'shelf'
  | 'propagation'
  | 'outdoor'
  | 'other'

export interface Space extends BaseRecord {
  name: string
  description?: string
  type: SpaceType
  parentSpaceId?: string
  archivedAt?: Date
  lightNotes?: string
  temperatureNotes?: string
  humidityNotes?: string
}

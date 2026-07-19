import type { BaseRecord } from './BaseRecord'

export type SpaceType = 'room' | 'cabinet' | 'greenhouse' | 'outdoor' | 'other'

export interface Space extends BaseRecord {
  name: string
  description?: string
  type: SpaceType
  parentId?: string
}

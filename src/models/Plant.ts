import type { BaseRecord } from './BaseRecord'

export type PlantKind = 'plant' | 'animal'
export type PlantStatus = 'thriving' | 'stable' | 'attention'

export interface Plant extends BaseRecord {
  commonName: string
  scientificName: string
  cultivar?: string
  kind: PlantKind
  status: PlantStatus
  acquiredAt: Date
  spaceId?: string
  notes?: string
}

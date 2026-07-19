import type { BaseRecord } from './BaseRecord'

export type PlantKind = 'plant' | 'animal'
export type PlantStatus = 'active' | 'archived'

export interface Plant extends BaseRecord {
  nickname: string
  scientificName: string
  commonName?: string
  cultivar?: string
  vendor?: string
  kind: PlantKind
  status: PlantStatus
  favorite: boolean
  purchaseDate?: Date
  heroImageUrl?: string
  spaceId?: string
  waterIntervalDays?: number
  fertilizerIntervalDays?: number
  mounted?: boolean
  mossPole?: boolean
  careNotes?: string
  notes?: string
}

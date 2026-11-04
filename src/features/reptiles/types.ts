import type { BaseRecord, Task } from '../../models'
export interface Reptile extends BaseRecord {
  name: string
  species: string
  sex: 'male' | 'female' | 'unknown'
  status: 'active' | 'archived'
  identification: Record<string, string>
  husbandry: Record<string, string>
  attention: boolean
  deleting: boolean
}
export type EventKind =
  | 'weight'
  | 'feeding'
  | 'supplement'
  | 'husbandry'
  | 'health'
  | 'milestone'
  | 'task'
export interface ReptileEvent extends BaseRecord {
  reptileId: string
  kind: EventKind
  occurredAt: Date
  notes: string
  payload: Record<string, unknown>
}
export interface FeederEntry {
  type: string
  offered: number
  consumed: number
  size: string
  gutLoaded: string
  supplements: string
}
export interface Supplement extends BaseRecord {
  name: string
  brand: string
  category: string
  d3: 'yes' | 'no' | 'unknown'
  notes: string
}
export interface Routine extends BaseRecord {
  reptileId: string
  supplementId?: string
  title: string
  type: string
  frequency:
    'once' | 'feeding' | 'days' | 'weeks' | 'weekdays' | 'monthly' | 'custom'
  intervalCount: number
  weekdays: number[]
  customDates: string[]
  startsAt: string
  timezone: string
  enabled: boolean
}
export interface ReptileMedia extends BaseRecord {
  reptileId: string
  eventId?: string
  fileName: string
  storagePath: string
  thumbnailPath?: string
  isProfile: boolean
  url?: string
}
export interface ReptileData {
  reptiles: Reptile[]
  events: ReptileEvent[]
  supplements: Supplement[]
  routines: Routine[]
  media: ReptileMedia[]
  tasks: Task[]
}
export const reptileTaskTypes: Record<string, string> = {
  feed: 'Feed',
  supplement: 'Dust supplements',
  weigh: 'Weigh',
  clean: 'Clean enclosure',
  'check-uvb': 'Check UVB',
  'replace-uvb': 'Replace UVB bulb',
  inspect: 'Inspect animal',
  vet: 'Veterinary appointment',
  custom: 'Other / custom',
}
export const feederTypes = [
  'Crickets',
  'Dubia roaches',
  'Silkworms',
  'Hornworms',
  'Black soldier fly larvae',
  'Locusts',
  'Other/custom',
]

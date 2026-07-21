import type { BaseRecord } from './BaseRecord'

export type ColonyType =
  | 'discoid-breeder'
  | 'discoid-grow-out'
  | 'cricket-breeder'
  | 'mealworm'
  | 'superworm'
  | 'fruit-fly'
  | 'isopod'
  | 'other'
export type ColonyStatus =
  | 'active'
  | 'starting'
  | 'producing'
  | 'low-production'
  | 'paused'
  | 'quarantine'
  | 'retired'
  | 'failed'
export type BatchStage =
  | 'breeding'
  | 'eggs-collected'
  | 'incubating'
  | 'hatching'
  | 'pinheads'
  | 'small'
  | 'medium'
  | 'large'
  | 'adult'
  | 'depleted'
  | 'failed'
export type FeederSize =
  | 'egg'
  | 'pinhead'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'adult'
  | 'mixed'
export type InventoryStatus =
  | 'available'
  | 'gut-loading'
  | 'reserved'
  | 'low-stock'
  | 'depleted'
  | 'expired'
  | 'quarantine'
export type QuantityUnit = 'count' | 'grams' | 'cups' | 'culture'
export type InventoryAction =
  | 'add'
  | 'remove'
  | 'feed-out'
  | 'transfer'
  | 'harvest-in'
  | 'mortality'
  | 'count-correction'
  | 'disposal'
export type MaintenanceAction =
  | 'feeding'
  | 'moisture-added'
  | 'water-crystals-replaced'
  | 'produce-added'
  | 'dry-food-added'
  | 'cleaning'
  | 'egg-crate-replaced'
  | 'substrate-added'
  | 'substrate-removed'
  | 'population-count'
  | 'temperature-check'
  | 'humidity-check'
  | 'colony-transfer'
  | 'mortality-check'
  | 'general-inspection'
  | 'other'

export interface FeederSpecies extends BaseRecord {
  name: string
  scientificName?: string
  active: boolean
}
export interface FeederColony extends BaseRecord {
  colonyId: string
  name: string
  speciesId: string
  type: ColonyType
  status: ColonyStatus
  dateStarted: Date
  source?: string
  binId: string
  location?: string
  estimatedPopulation?: number
  adultFemales?: number
  adultMales?: number
  juveniles?: number
  temperature?: number
  humidity?: number
  food?: string
  moistureSource?: string
  productionStatus?: string
  notes?: string
  qrValue: string
  archivedAt?: Date
}
export interface CricketBatch extends BaseRecord {
  batchId: string
  parentColonyId?: string
  breederStartedAt?: Date
  substrateAddedAt?: Date
  eggsCollectedAt?: Date
  eggsMovedAt?: Date
  incubationTemperature?: number
  incubationHumidity?: number
  estimatedHatchAt?: Date
  firstHatchAt?: Date
  mainHatchAt?: Date
  estimatedHatched?: number
  size: FeederSize
  quantity: number
  binId: string
  stage: BatchStage
  lastFedAt?: Date
  lastMoistureAt?: Date
  notes?: string
  qrValue: string
  archivedAt?: Date
}
export interface FeederInventoryItem extends BaseRecord {
  inventoryId: string
  speciesId: string
  variety?: string
  size: FeederSize
  quantity: number
  unit: QuantityUnit
  sourceColonyId?: string
  sourceBatchId?: string
  storageBin: string
  dateAdded: Date
  datePurchased?: Date
  supplier?: string
  cost?: number
  gutLoadStatus?: string
  gutLoadStartedAt?: Date
  lastFedAt?: Date
  lastMoistureAt?: Date
  useByAt?: Date
  minimumStock: number
  status: InventoryStatus
  notes?: string
  qrValue: string
  archivedAt?: Date
}
export interface InventoryTransaction extends BaseRecord {
  inventoryId: string
  action: InventoryAction
  quantityDelta: number
  balanceAfter: number
  occurredAt: Date
  sourceId?: string
  notes?: string
}
export interface MaintenanceLog extends BaseRecord {
  colonyId?: string
  batchId?: string
  action: MaintenanceAction
  occurredAt: Date
  material?: string
  amount?: string
  temperature?: number
  humidity?: number
  observations?: string
  mortality?: number
  notes?: string
  userName?: string
}
export type HarvestDestination =
  | 'fed-immediately'
  | 'inventory'
  | 'grow-out'
  | 'sold'
  | 'given-away'
  | 'disposed'
  | 'other'
export interface HarvestLog extends BaseRecord {
  harvestId: string
  occurredAt: Date
  colonyId?: string
  batchId?: string
  speciesId: string
  size: FeederSize
  quantity: number
  unit: QuantityUnit
  destination: HarvestDestination
  animalId?: string
  inventoryId?: string
  mortality?: number
  notes?: string
}
export interface FeedingLog extends BaseRecord {
  occurredAt: Date
  animalId?: string
  animalName?: string
  speciesId: string
  size: FeederSize
  quantityOffered: number
  quantityEaten: number
  inventoryId?: string
  colonyId?: string
  batchId?: string
  supplements: string[]
  notes?: string
}
export interface FeederSettings extends BaseRecord {
  key: string
  value: number
  label: string
}

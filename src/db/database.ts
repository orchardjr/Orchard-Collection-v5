import Dexie, { type Table } from 'dexie'

import type {
  CricketBatch,
  FeederColony,
  FeederInventoryItem,
  FeederSettings,
  FeederSpecies,
  FeedingLog,
  HarvestLog,
  InventoryTransaction,
  MaintenanceLog,
  MediaAsset,
  NfcTag,
  Plant,
  Space,
  Task,
  TimelineEvent,
} from '../models'

interface LegacyPlant {
  id: string
  commonName: string
  scientificName: string
  status: 'thriving' | 'stable' | 'attention' | 'active'
  acquiredAt: Date
  nickname?: string
  favorite?: boolean
  purchaseDate?: Date
}

interface LegacyMediaAsset {
  id: string
  blob?: Blob
}
interface LegacyTask extends Omit<Task, 'status' | 'priority' | 'type'> {
  status: string
  priority: string
  type?: Task['type']
}

export class OrchardDatabase extends Dexie {
  plants!: Table<Plant, string>
  timeline!: Table<TimelineEvent, string>
  tasks!: Table<Task, string>
  spaces!: Table<Space, string>
  media!: Table<MediaAsset, string>
  feederSpecies!: Table<FeederSpecies, string>
  feederColonies!: Table<FeederColony, string>
  cricketBatches!: Table<CricketBatch, string>
  feederInventory!: Table<FeederInventoryItem, string>
  inventoryTransactions!: Table<InventoryTransaction, string>
  maintenanceLogs!: Table<MaintenanceLog, string>
  harvestLogs!: Table<HarvestLog, string>
  feedingLogs!: Table<FeedingLog, string>
  feederSettings!: Table<FeederSettings, string>
  nfcTags!: Table<NfcTag, string>

  constructor() {
    super('orchard-collection')

    this.version(1).stores({
      items: 'id, title, category, createdAt',
    })

    this.version(2).stores({
      items: null,
      plants:
        'id, commonName, scientificName, kind, status, acquiredAt, spaceId, createdAt',
      timeline: 'id, plantId, eventType, occurredAt, createdAt',
      tasks: 'id, plantId, status, priority, dueAt, createdAt',
      spaces: 'id, name, type, parentId, createdAt',
      media: 'id, plantId, type, capturedAt, createdAt',
    })

    this.version(3).stores({
      plants:
        'id, nickname, scientificName, status, favorite, purchaseDate, spaceId, createdAt',
    })

    this.version(4)
      .stores({
        plants:
          'id, nickname, scientificName, status, favorite, purchaseDate, spaceId, createdAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<LegacyPlant, string>('plants')
          .toCollection()
          .modify((plant) => {
            plant.nickname ??= plant.commonName
            plant.favorite ??= false
            plant.purchaseDate ??= plant.acquiredAt
            plant.status = 'active'
          })
      })

    this.version(5)
      .stores({
        plants:
          'id, nickname, scientificName, status, favorite, purchaseDate, spaceId, heroMediaId, createdAt',
        media:
          'id, plantId, fingerprint, isHero, isFavorite, dateTaken, uploadedAt, updatedAt, *tags',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<LegacyMediaAsset, string>('media')
          .filter((asset) => !(asset.blob instanceof Blob))
          .delete()
      })

    this.version(6).stores({
      spaces: 'id, name, type, parentSpaceId, archivedAt, createdAt',
      tasks:
        'id, plantId, spaceId, status, type, priority, dueAt, recurrenceSourceId, archivedAt, createdAt',
      timeline:
        'id, plantId, spaceId, eventType, occurredAt, isManual, createdAt',
    })

    this.version(7)
      .stores({
        feederSpecies: 'id, &name, active, createdAt',
        feederColonies:
          'id, &colonyId, speciesId, type, status, dateStarted, binId, &qrValue, archivedAt, createdAt',
        cricketBatches:
          'id, &batchId, parentColonyId, stage, estimatedHatchAt, binId, &qrValue, archivedAt, createdAt',
        feederInventory:
          'id, &inventoryId, speciesId, size, status, sourceColonyId, sourceBatchId, storageBin, &qrValue, archivedAt, createdAt',
        inventoryTransactions: 'id, inventoryId, action, occurredAt, createdAt',
        maintenanceLogs: 'id, colonyId, batchId, action, occurredAt, createdAt',
        harvestLogs:
          'id, &harvestId, colonyId, batchId, speciesId, occurredAt, destination, createdAt',
        feedingLogs:
          'id, animalId, inventoryId, colonyId, batchId, occurredAt, createdAt',
        feederSettings: 'id, &key, createdAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<Space & { parentId?: string }, string>('spaces')
          .toCollection()
          .modify((space) => {
            space.parentSpaceId ??= space.parentId
            delete space.parentId
          })
        await transaction
          .table<LegacyTask, string>('tasks')
          .toCollection()
          .modify((task) => {
            task.status = task.status === 'completed' ? 'completed' : 'open'
            task.priority =
              task.priority === 'medium' ? 'normal' : task.priority
            task.type ??= 'custom'
            task.recurrence ??= 'none'
          })
      })

    this.version(8).stores({
      nfcTags:
        'id, &publicToken, resourceType, resourceId, &uid, assignedAt, lastScannedAt, createdAt',
    })

    this.version(9)
      .stores({
        nfcTags:
          'id, &publicToken, resourceType, resourceId, &uid, assignedAt, lastScannedAt, createdAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<NfcTag, string>('nfcTags')
          .toCollection()
          .modify((tag) => {
            tag.scanCount ??= 0
          })
      })
  }
}

export const db = new OrchardDatabase()

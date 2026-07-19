import Dexie, { type Table } from 'dexie'

import type { MediaAsset, Plant, Space, Task, TimelineEvent } from '../models'

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

export class OrchardDatabase extends Dexie {
  plants!: Table<Plant, string>
  timeline!: Table<TimelineEvent, string>
  tasks!: Table<Task, string>
  spaces!: Table<Space, string>
  media!: Table<MediaAsset, string>

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
  }
}

export const db = new OrchardDatabase()

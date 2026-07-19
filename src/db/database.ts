import Dexie, { type Table } from 'dexie'

import type { MediaAsset, Plant, Space, Task, TimelineEvent } from '../models'

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
  }
}

export const db = new OrchardDatabase()

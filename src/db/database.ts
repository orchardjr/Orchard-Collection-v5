import Dexie, { type EntityTable } from 'dexie'

export interface CollectionItem {
  id: string
  title: string
  category: string
  createdAt: Date
}

class OrchardDatabase extends Dexie {
  items!: EntityTable<CollectionItem, 'id'>

  constructor() {
    super('orchard-collection')
    this.version(1).stores({
      items: 'id, title, category, createdAt',
    })
  }
}

export const db = new OrchardDatabase()

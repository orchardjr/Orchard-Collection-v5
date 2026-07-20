import type { Space } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class SpaceRepository extends BaseRepository<Space> {
  constructor() {
    super(db.spaces)
  }

  getActive(): Promise<Space[]> {
    return db.spaces.filter((space) => !space.archivedAt).toArray()
  }

  getChildren(parentSpaceId: string): Promise<Space[]> {
    return db.spaces.where('parentSpaceId').equals(parentSpaceId).toArray()
  }

  getPlantCount(id: string): Promise<number> {
    return db.plants.where('spaceId').equals(id).count()
  }

  archive(id: string) {
    return this.update(id, { archivedAt: new Date() })
  }
  restore(id: string) {
    return this.update(id, { archivedAt: undefined })
  }
}

export const spaceRepository = new SpaceRepository()

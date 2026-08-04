import type { Plant } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class PlantRepository extends BaseRepository<Plant> {
  constructor() {
    super(db.plants)
  }

  async deletePermanently(id: string) {
    await db.transaction(
      'rw',
      [
        db.plants,
        db.media,
        db.timeline,
        db.tasks,
        db.nfcTags,
        db.harvestLogs,
        db.feedingLogs,
      ],
      async () => {
        await Promise.all([
          db.media.where('plantId').equals(id).delete(),
          db.timeline.where('plantId').equals(id).delete(),
          db.tasks.where('plantId').equals(id).delete(),
          db.nfcTags
            .where('resourceId')
            .equals(id)
            .filter((tag) => tag.resourceType === 'plant')
            .delete(),
          db.harvestLogs
            .where('animalId')
            .equals(id)
            .modify({ animalId: undefined }),
          db.feedingLogs
            .where('animalId')
            .equals(id)
            .modify({ animalId: undefined }),
        ])
        await db.plants.delete(id)
      },
    )
  }
}

export const plantRepository = new PlantRepository()

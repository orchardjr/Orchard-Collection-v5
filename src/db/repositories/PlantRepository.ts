import type { Plant } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'
import { assignedPlantIds } from '../../features/tasks/taskScheduling'

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
          db.nfcTags
            .where('resourceId')
            .equals(id)
            .filter((tag) => tag.resourceType === 'plant')
            .delete(),
          db.harvestLogs
            .filter((log) => log.animalId === id)
            .modify({ animalId: undefined }),
          db.feedingLogs
            .where('animalId')
            .equals(id)
            .modify({ animalId: undefined }),
        ])
        for (const task of await db.tasks
          .filter((task) => assignedPlantIds(task).includes(id))
          .toArray()) {
          const remaining = assignedPlantIds(task).filter(
            (plantId) => plantId !== id,
          )
          if (remaining.length)
            await db.tasks.update(task.id, {
              plantIds: remaining,
              plantId: remaining.length === 1 ? remaining[0] : undefined,
            })
          else await db.tasks.delete(task.id)
        }
        await db.plants.delete(id)
      },
    )
  }
}

export const plantRepository = new PlantRepository()

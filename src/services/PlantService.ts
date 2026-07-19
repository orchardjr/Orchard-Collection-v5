import { db } from '../db/database'
import type { CreateInput, UpdateInput } from '../db/repositories'
import { plantRepository, timelineRepository } from '../db/repositories'
import { getPlantDisplayName } from '../lib/plants'
import type { Plant } from '../models'

export class PlantService {
  async create(input: CreateInput<Plant>): Promise<Plant> {
    return db.transaction('rw', db.plants, db.timeline, async () => {
      const plant = await plantRepository.create(input)
      await timelineRepository.create({
        plantId: plant.id,
        title: 'Plant created',
        description: `${getPlantDisplayName(plant)} was added to the collection.`,
        eventType: 'acquired',
        occurredAt: new Date(),
      })
      return plant
    })
  }

  async update(
    id: string,
    input: UpdateInput<Plant>,
  ): Promise<Plant | undefined> {
    return db.transaction('rw', db.plants, db.timeline, async () => {
      const plant = await plantRepository.update(id, input)
      if (plant) {
        await timelineRepository.create({
          plantId: plant.id,
          title: 'Plant updated',
          description: `${getPlantDisplayName(plant)} was updated.`,
          eventType: 'note',
          occurredAt: new Date(),
        })
      }
      return plant
    })
  }

  archive(id: string): Promise<Plant | undefined> {
    return this.update(id, { status: 'archived' })
  }
}

export const plantService = new PlantService()

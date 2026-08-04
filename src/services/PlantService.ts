import { db } from '../db/database'
import type { CreateInput, UpdateInput } from '../db/repositories'
import { plantRepository, timelineRepository } from '../db/repositories'
import { getPlantDisplayName } from '../lib/plants'
import type { Plant } from '../models'
import { isSupabaseConfigured } from '../lib/supabase'

export class PlantService {
  async create(input: CreateInput<Plant>): Promise<Plant> {
    const operation = async () => {
      const plant = await plantRepository.create(input)
      await timelineRepository.create({
        plantId: plant.id,
        title: 'Plant created',
        description: `${getPlantDisplayName(plant)} was added to the collection.`,
        eventType: 'acquired',
        occurredAt: new Date(),
      })
      return plant
    }
    return isSupabaseConfigured
      ? operation()
      : db.transaction('rw', db.plants, db.timeline, operation)
  }

  async update(
    id: string,
    input: UpdateInput<Plant>,
  ): Promise<Plant | undefined> {
    const operation = async () => {
      const previous = await plantRepository.getById(id)
      const plant = await plantRepository.update(id, input)
      if (plant) {
        const moved =
          Object.prototype.hasOwnProperty.call(input, 'spaceId') &&
          input.spaceId !== previous?.spaceId
        await timelineRepository.create({
          plantId: plant.id,
          title: moved
            ? 'Space changed'
            : input.status === 'archived'
              ? 'Plant archived'
              : input.status === 'active' && previous?.status === 'archived'
                ? 'Plant restored'
                : 'Plant updated',
          description: moved
            ? `${getPlantDisplayName(plant)} moved to a different space.`
            : input.status === 'active' && previous?.status === 'archived'
              ? `${getPlantDisplayName(plant)} was restored to the active collection.`
              : `${getPlantDisplayName(plant)} was updated.`,
          eventType: moved ? 'moved' : 'note',
          occurredAt: new Date(),
          spaceId: moved ? plant.spaceId : undefined,
        })
      }
      return plant
    }
    return isSupabaseConfigured
      ? operation()
      : db.transaction('rw', db.plants, db.timeline, operation)
  }

  archive(id: string): Promise<Plant | undefined> {
    return this.update(id, { status: 'archived' })
  }

  restore(id: string): Promise<Plant | undefined> {
    return this.update(id, { status: 'active' })
  }

  deletePermanently(id: string): Promise<void> {
    return plantRepository.deletePermanently(id)
  }
}

export const plantService = new PlantService()

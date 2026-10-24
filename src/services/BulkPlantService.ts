import {
  plantRepository,
  spaceRepository,
  taskRepository,
} from '../db/repositories'
import { plantService } from './PlantService'
import { taskService } from './TaskService'
import { normalizeTagNames, plantTagService } from './PlantTagService'
import type { Plant, Task } from '../models'
import type { CareProfileInput } from '../features/tasks/taskScheduling'

// Omitted means leave unchanged; null location and zero interval are explicit clears.
export interface BulkPlantChanges {
  spaceId?: string | null
  addTags?: string[]
  removeTags?: string[]
  waterIntervalDays?: number
  fertilizerIntervalDays?: number
}
export interface BulkPlantResult {
  succeeded: string[]
  failed: { id: string; name: string; message: string }[]
}
export function validateBulkPlantChanges(changes: BulkPlantChanges) {
  const add = normalizeTagNames(changes.addTags ?? [])
  const remove = normalizeTagNames(changes.removeTags ?? [])
  if (add.some((tag) => remove.includes(tag)))
    throw new Error('A tag cannot be both added and removed.')
  if (changes.spaceId === '') throw new Error('Choose a space or No space.')
  for (const value of [
    changes.waterIntervalDays,
    changes.fertilizerIntervalDays,
  ]) {
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 0 || value > 3650)
    )
      throw new Error(
        'Intervals must be whole numbers from 1 to 3650 days, or disabled.',
      )
  }
  if (
    changes.spaceId === undefined &&
    changes.waterIntervalDays === undefined &&
    changes.fertilizerIntervalDays === undefined &&
    !add.length &&
    !remove.length
  )
    throw new Error('Choose at least one change.')
}
export function bulkCareProfile(
  plant: Plant,
  tasks: Task[],
  changes: BulkPlantChanges,
): CareProfileInput {
  const managed = (type: Task['type']) =>
    tasks.some(
      (task) =>
        task.type === type && task.careManaged && task.status === 'open',
    )
  return {
    waterIntervalDays: changes.waterIntervalDays ?? plant.waterIntervalDays,
    fertilizerIntervalDays:
      changes.fertilizerIntervalDays ?? plant.fertilizerIntervalDays,
    lastWateredAt: plant.lastWateredAt,
    lastFertilizedAt: plant.lastFertilizedAt,
    mounted: plant.mounted,
    mossPole: plant.mossPole,
    careNotes: plant.careNotes,
    waterTask: managed('water') && changes.waterIntervalDays !== 0,
    fertilizerTask:
      managed('fertilize') && changes.fertilizerIntervalDays !== 0,
  }
}
export class BulkPlantService {
  async apply(
    ids: string[],
    changes: BulkPlantChanges,
    progress?: (done: number, total: number) => void,
  ): Promise<BulkPlantResult> {
    validateBulkPlantChanges(changes)
    const uniqueIds = [...new Set(ids)]
    if (!uniqueIds.length) throw new Error('Select at least one plant.')
    if (changes.spaceId) {
      const space = await spaceRepository.getById(changes.spaceId)
      if (!space || space.archivedAt)
        throw new Error(
          'The selected space is no longer available. Choose an active space.',
        )
    }
    const add = normalizeTagNames(changes.addTags ?? []),
      remove = normalizeTagNames(changes.removeTags ?? [])
    const updateTags =
      add.length || remove.length
        ? await plantTagService.prepare(add, remove)
        : undefined
    const result: BulkPlantResult = { succeeded: [], failed: [] }
    for (const id of uniqueIds) {
      let name = id
      try {
        // Re-read each plant so we never copy one plant's care history onto another.
        const plant = await plantRepository.getById(id)
        if (!plant)
          throw new Error('Plant no longer exists or is not accessible.')
        name = plant.nickname || plant.scientificName || id
        if (
          changes.waterIntervalDays !== undefined ||
          changes.fertilizerIntervalDays !== undefined
        ) {
          const tasks = await taskRepository.getByPlantId(id)
          await taskService.saveCare(id, bulkCareProfile(plant, tasks, changes))
        }
        if (
          changes.spaceId !== undefined &&
          (changes.spaceId ?? undefined) !== plant.spaceId
        ) {
          const saved = await plantService.update(id, {
            spaceId: changes.spaceId ?? undefined,
          })
          if (!saved) throw new Error('Plant could not be updated.')
        }
        await updateTags?.(id)
        result.succeeded.push(id)
      } catch (error) {
        result.failed.push({
          id,
          name,
          message:
            error instanceof Error
              ? error.message
              : 'Could not save this plant.',
        })
      }
      progress?.(
        result.succeeded.length + result.failed.length,
        uniqueIds.length,
      )
    }
    return result
  }
}
export const bulkPlantService = new BulkPlantService()

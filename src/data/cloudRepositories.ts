import type { Plant, Space, Task, TimelineEvent } from '../models'
import { requireSupabase } from '../lib/supabase'
import { assertOnline, SupabaseRepository } from './SupabaseRepository'
import { formatSupabaseErrorDetails } from './supabaseErrorDetails'

export class CloudPlantRepository extends SupabaseRepository<Plant> {
  constructor() {
    super('plants')
  }

  async deletePermanently(id: string) {
    assertOnline()
    const client = requireSupabase()
    const { data, error } = await client.rpc('delete_plant_permanently', {
      target_plant_id: id,
    })
    if (error)
      throw new Error(
        `Permanent plant deletion failed. Plant ID: ${id}. ${formatSupabaseErrorDetails(error)}`,
        { cause: error },
      )

    const paths = Array.isArray(data)
      ? data.filter((path): path is string => typeof path === 'string')
      : []
    if (!paths.length) return
    const removal = await client.storage.from('plant-media').remove(paths)
    if (removal.error)
      throw new Error(
        `The plant and related database records were deleted, but Storage cleanup failed. ${formatSupabaseErrorDetails(removal.error)}`,
        { cause: removal.error },
      )
  }
}

export class CloudSpaceRepository extends SupabaseRepository<Space> {
  constructor() {
    super('spaces')
  }
  async getActive() {
    return (await this.getAll()).filter((space) => !space.archivedAt)
  }
  async getChildren(parentSpaceId: string) {
    return (await this.getAll()).filter(
      (space) => space.parentSpaceId === parentSpaceId,
    )
  }
  async getPlantCount(id: string) {
    return (await cloudPlantRepository.getAll()).filter(
      (plant) => plant.spaceId === id,
    ).length
  }
  archive(id: string) {
    return this.update(id, { archivedAt: new Date() })
  }
  restore(id: string) {
    return this.update(id, { archivedAt: undefined })
  }
}

export class CloudTaskRepository extends SupabaseRepository<Task> {
  constructor() {
    super('tasks')
  }
  async getOpen() {
    return (await this.getAll()).filter((task) => task.status === 'open')
  }
  async getByPlantId(id: string) {
    return (await this.getAll()).filter((task) => task.plantId === id)
  }
  async getBySpaceId(id: string) {
    return (await this.getAll()).filter((task) => task.spaceId === id)
  }
  async getDueToday(now = new Date()) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return (await this.getOpen()).filter(
      (task) => task.dueAt && task.dueAt >= start && task.dueAt < end,
    )
  }
  async getOverdue(now = new Date()) {
    return (await this.getOpen()).filter(
      (task) => task.dueAt && task.dueAt < now,
    )
  }
  async getUpcoming(now = new Date()) {
    const end = new Date(now)
    end.setDate(end.getDate() + 30)
    return (await this.getOpen()).filter(
      (task) => task.dueAt && task.dueAt >= now && task.dueAt <= end,
    )
  }
}

export class CloudTimelineRepository extends SupabaseRepository<TimelineEvent> {
  constructor() {
    super('timeline_events')
  }
  async getByPlantId(plantId: string) {
    return (await this.getAllNewest()).filter(
      (event) => event.plantId === plantId,
    )
  }
  async getAllNewest() {
    return (await this.getAll()).sort(
      (first, second) =>
        second.occurredAt.getTime() - first.occurredAt.getTime(),
    )
  }
  override async update(id: string, input: Partial<TimelineEvent>) {
    const event = await this.getById(id)
    if (!event?.isManual)
      throw new Error('System timeline events cannot be edited.')
    return super.update(id, input)
  }
  override async delete(id: string) {
    const event = await this.getById(id)
    if (!event?.isManual)
      throw new Error('System timeline events cannot be deleted.')
    return super.delete(id)
  }
}

export const cloudPlantRepository = new CloudPlantRepository()
export const cloudSpaceRepository = new CloudSpaceRepository()
export const cloudTaskRepository = new CloudTaskRepository()
export const cloudTimelineRepository = new CloudTimelineRepository()

import type { TimelineEvent } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'
import type { UpdateInput } from './BaseRepository'

export class TimelineRepository extends BaseRepository<TimelineEvent> {
  constructor() {
    super(db.timeline)
  }

  async getByPlantId(plantId: string): Promise<TimelineEvent[]> {
    const events = await db.timeline
      .where('plantId')
      .equals(plantId)
      .sortBy('occurredAt')
    return events.reverse()
  }

  async getAllNewest(): Promise<TimelineEvent[]> {
    return (await db.timeline.orderBy('occurredAt').toArray()).reverse()
  }

  override async update(id: string, input: UpdateInput<TimelineEvent>) {
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

export const timelineRepository = new TimelineRepository()

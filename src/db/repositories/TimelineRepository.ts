import type { TimelineEvent } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

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
}

export const timelineRepository = new TimelineRepository()

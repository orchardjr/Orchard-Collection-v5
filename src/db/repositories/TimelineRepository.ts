import type { TimelineEvent } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class TimelineRepository extends BaseRepository<TimelineEvent> {
  constructor() {
    super(db.timeline)
  }

  getByPlantId(plantId: string): Promise<TimelineEvent[]> {
    return db.timeline
      .where('plantId')
      .equals(plantId)
      .reverse()
      .sortBy('occurredAt')
  }
}

export const timelineRepository = new TimelineRepository()

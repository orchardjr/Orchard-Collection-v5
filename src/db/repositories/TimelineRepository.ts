import type { TimelineEvent } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class TimelineRepository extends BaseRepository<TimelineEvent> {
  constructor() {
    super(db.timeline)
  }
}

export const timelineRepository = new TimelineRepository()

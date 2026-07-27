import type { CreateInput, UpdateInput } from '../db/repositories'
import { timelineRepository } from '../db/repositories'
import type { TimelineEvent } from '../models'

export class TimelineService {
  createObservation(input: Omit<CreateInput<TimelineEvent>, 'isManual'>) {
    return timelineRepository.create({ ...input, isManual: true })
  }
  updateObservation(id: string, input: UpdateInput<TimelineEvent>) {
    return timelineRepository.update(id, input)
  }
  deleteObservation(id: string) {
    return timelineRepository.delete(id)
  }
}

export const timelineService = new TimelineService()

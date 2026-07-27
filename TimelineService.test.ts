import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { timelineRepository } from '../db/repositories'
import { filterTimeline } from '../features/timeline/timelineFilters'
import { TimelineService } from './TimelineService'
const service = new TimelineService()
describe('TimelineService', () => {
  beforeEach(() => db.timeline.clear())
  it('orders and filters newest first', async () => {
    await timelineRepository.create({
      title: 'Old',
      eventType: 'note',
      occurredAt: new Date('2026-01-01'),
    })
    await timelineRepository.create({
      title: 'New growth',
      eventType: 'growth',
      occurredAt: new Date('2026-02-01'),
      plantId: 'p1',
    })
    const events = await timelineRepository.getAllNewest()
    expect(events.map((e) => e.title)).toEqual(['New growth', 'Old'])
    expect(
      filterTimeline(events, {
        search: 'growth',
        type: 'growth',
        plantId: 'p1',
        spaceId: '',
        from: '',
        to: '',
      }),
    ).toHaveLength(1)
  })
  it('allows manual observation edits and deletes', async () => {
    const event = await service.createObservation({
      plantId: 'p1',
      title: 'Observed',
      eventType: 'observation',
      occurredAt: new Date(),
    })
    expect(
      (await service.updateObservation(event.id, { title: 'Edited' }))?.title,
    ).toBe('Edited')
    await service.deleteObservation(event.id)
    expect(await timelineRepository.getById(event.id)).toBeUndefined()
  })
  it('keeps system events immutable', async () => {
    const event = await timelineRepository.create({
      title: 'System',
      eventType: 'note',
      occurredAt: new Date(),
    })
    await expect(
      timelineRepository.update(event.id, { title: 'Changed' }),
    ).rejects.toThrow(/System/)
    await expect(timelineRepository.delete(event.id)).rejects.toThrow(/System/)
  })
})

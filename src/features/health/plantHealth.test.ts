import { describe, expect, it } from 'vitest'
import { healthByPlant, healthHistory, healthObservation } from './plantHealth'
import type { TimelineEvent } from '../../models'
const event = (
  id: string,
  status: 'healthy' | 'quarantined',
  time: number,
): TimelineEvent => ({
  ...healthObservation('plant', status, 'Notes'),
  id,
  occurredAt: new Date(time),
  createdAt: new Date(time),
  updatedAt: new Date(time),
})
describe('plant health', () => {
  it('uses the latest observation, regardless of input order', () => {
    const events = [event('a', 'healthy', 1), event('b', 'quarantined', 2)]
    expect(healthByPlant(events).get('plant')).toBe('quarantined')
    expect(healthByPlant(events.reverse()).get('plant')).toBe('quarantined')
    expect(healthHistory(events, 'plant').map((e) => e.id)).toEqual(['b', 'a'])
  })
  it('does not assume unrecorded plants are healthy or mistake ordinary events for health', () => {
    const ordinary = { ...event('a', 'healthy', 1), metadata: {} }
    expect(healthByPlant([ordinary]).size).toBe(0)
    expect(healthHistory([ordinary], 'plant')).toEqual([])
  })
  it('creates existing observation records without changing lifecycle or care fields', () => {
    const input = healthObservation(
      'p',
      'treatment',
      '  Treated leaves  ',
      'photo',
    )
    expect(input).toMatchObject({
      plantId: 'p',
      eventType: 'observation',
      isManual: true,
      description: 'Treated leaves',
      metadata: { healthStatus: 'treatment', mediaId: 'photo' },
    })
    expect(input).not.toHaveProperty('status')
  })
  it('rejects unsupported metadata and keeps histories plant-specific', () => {
    expect(
      healthByPlant([
        {
          ...event('a', 'healthy', 1),
          metadata: { feature: 'plant-health-v1', healthStatus: 'other' },
        },
      ]).size,
    ).toBe(0)
    expect(healthHistory([event('a', 'healthy', 1)], 'other')).toEqual([])
    expect(() => healthObservation('', 'healthy', '')).toThrow()
    expect(() => healthObservation('p', 'healthy', 'x'.repeat(10001))).toThrow()
  })
})

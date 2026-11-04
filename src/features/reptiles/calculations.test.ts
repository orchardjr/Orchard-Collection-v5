import { expect, it } from 'vitest'
import {
  ageLabel,
  eventCsv,
  feedingTotals,
  rangeStart,
  validateEvent,
  weightHistory,
} from './calculations'
import type { ReptileEvent } from './types'
const event = (id: string, grams: number, date: string): ReptileEvent => ({
  id,
  reptileId: 'r',
  kind: 'weight',
  payload: { grams },
  occurredAt: new Date(date),
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
})
it('calculates weight changes without labelling gain/loss as good or bad', () => {
  const rows = weightHistory([
    event('c', 10.1, '2026-11-01'),
    event('a', 6.8, '2026-10-01'),
    event('b', 8.2, '2026-10-15'),
  ])
  expect(rows.map((r) => r.grams)).toEqual([6.8, 8.2, 10.1])
  expect(rows[0]!.change).toBeUndefined()
  expect(rows[1]!.change).toBeCloseTo(1.4)
  expect(rows[2]!.percent).toBeCloseTo(23.1707)
  expect(rows[2]).not.toHaveProperty('health')
})
it('supports all chart ranges and unknown age', () => {
  const now = new Date(2026, 10, 3)
  expect(rangeStart('30', now).getDate()).toBe(4)
  expect(rangeStart('90', now) < rangeStart('30', now)).toBe(true)
  expect(rangeStart('6m', now).getMonth()).toBe(4)
  expect(rangeStart('1y', now).getFullYear()).toBe(2025)
  expect(rangeStart('all', now).getTime()).toBe(0)
  expect(ageLabel({})).toBe('Age unknown')
})
it('validates feeding quantities, weights, humidity and actual dates', () => {
  expect(() => validateEvent('weight', { grams: 0 }, new Date())).toThrow()
  expect(() =>
    validateEvent('weight', { grams: 6.8 }, new Date()),
  ).not.toThrow()
  expect(() =>
    validateEvent(
      'feeding',
      { feeders: [{ type: 'Crickets', offered: 2, consumed: 3 }] },
      new Date(),
    ),
  ).toThrow()
  expect(() =>
    validateEvent('husbandry', { dayHumidity: 101 }, new Date()),
  ).toThrow()
  expect(() =>
    validateEvent('health', {}, new Date(Date.now() + 100000)),
  ).toThrow()
})
it('exports multiple feeder lines, Unicode and spreadsheet-safe CSV', () => {
  const feeding = {
    ...event('a', 1, '2026-10-01'),
    kind: 'feeding',
    notes: 'quote " and\nnewline',
    payload: {
      feeders: [
        {
          type: 'Crickets',
          offered: 4,
          consumed: 3,
          size: 'small',
          gutLoaded: 'yes',
          supplements: 'None',
        },
        {
          type: 'Silkworms',
          offered: 2,
          consumed: 1,
          size: 'small',
          gutLoaded: 'no',
          supplements: '',
        },
      ],
      appetite: 'Normal',
    },
  } as ReptileEvent
  expect(feedingTotals([feeding])).toEqual({ offered: 6, consumed: 4 })
  const csv = eventCsv(
    [feeding],
    'feeding',
    new Map([['r', '=HYPERLINK("x")']]),
  )
  expect(csv).toContain("'=HYPERLINK")
  expect(csv).toContain('Silkworms')
  expect(csv).toContain('quote "" and\nnewline')
  expect(
    eventCsv(
      [event('a', 6.8, '2026-10-01')],
      'weight',
      new Map([['r', 'Écho']]),
    ),
  ).toContain('Écho')
})

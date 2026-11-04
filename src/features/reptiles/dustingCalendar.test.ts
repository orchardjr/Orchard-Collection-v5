// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import {
  buildDustingCalendar,
  nextDustingDay,
  calendarDay,
} from './dustingCalendar'
import { dustingPdf } from './dustingPdf'
import type { ReptileData, Routine } from './types'
const base = { createdAt: new Date(), updatedAt: new Date() }
const routine: Routine = {
  ...base,
  id: 'routine',
  reptileId: 'a',
  supplementId: 's',
  title: 'Dust',
  type: 'supplement',
  frequency: 'days',
  intervalCount: 7,
  weekdays: [],
  customDates: [],
  startsAt: '2026-11-01T12:00:00Z',
  timezone: 'America/Toronto',
  enabled: true,
}
const data: ReptileData = {
  reptiles: [
    {
      ...base,
      id: 'a',
      name: 'Écho',
      species: 'Chameleon',
      sex: 'unknown',
      status: 'active',
      identification: {},
      husbandry: {},
      attention: false,
      deleting: false,
    },
  ],
  routines: [routine],
  supplements: [
    {
      ...base,
      id: 's',
      name: 'Calcium',
      brand: 'Example',
      category: 'calcium-d3',
      d3: 'yes',
      notes: '',
    },
  ],
  events: [],
  tasks: [],
  media: [],
}
it('projects interval dates without changing saved data', () => {
  const before = JSON.stringify(data)
  expect(
    buildDustingCalendar(data, ['a'], '2026-11').entries.map((e) => e.day),
  ).toEqual([
    '2026-11-01',
    '2026-11-08',
    '2026-11-15',
    '2026-11-22',
    '2026-11-29',
  ])
  expect(JSON.stringify(data)).toBe(before)
})
it('handles weekly, weekday, custom and clamped monthly recurrences', () => {
  expect(
    nextDustingDay(
      { ...routine, frequency: 'weeks', intervalCount: 2 },
      '2026-11-01',
    ),
  ).toBe('2026-11-15')
  expect(
    nextDustingDay(
      { ...routine, frequency: 'weekdays', weekdays: [1, 4] },
      '2026-11-02',
    ),
  ).toBe('2026-11-05')
  expect(
    nextDustingDay({ ...routine, frequency: 'monthly' }, '2028-01-31'),
  ).toBe('2028-02-29')
  expect(
    nextDustingDay(
      {
        ...routine,
        frequency: 'custom',
        customDates: ['2026-12-04', '2026-11-08'],
      },
      '2026-11-01',
    ),
  ).toBe('2026-11-08')
  expect(calendarDay(new Date('2026-11-01T01:00:00Z'), 'America/Toronto')).toBe(
    '2026-10-31',
  )
})
it('anchors future estimates after saved tasks without duplicate dates', () => {
  const calendar = buildDustingCalendar(
    {
      ...data,
      tasks: [
        {
          ...base,
          id: 't',
          title: 'Dust',
          type: 'custom',
          status: 'completed',
          priority: 'normal',
          reptileRoutineId: 'routine',
          dueAt: new Date('2026-11-01T12:00:00Z'),
          completedAt: new Date('2026-11-03T12:00:00Z'),
        },
      ],
    },
    ['a'],
    '2026-11',
  )
  expect(calendar.entries.slice(0, 2).map((e) => [e.day, e.state])).toEqual([
    ['2026-11-01', 'Completed'],
    ['2026-11-10', 'Planned'],
  ])
})
it('filters selection and archives, handles disabled and every-feeding routines and D3 overlaps', () => {
  expect(buildDustingCalendar(data, [], '2026-11').entries).toHaveLength(0)
  expect(
    buildDustingCalendar(
      { ...data, reptiles: [{ ...data.reptiles[0]!, status: 'archived' }] },
      ['a'],
      '2026-11',
    ).entries,
  ).toHaveLength(0)
  expect(
    buildDustingCalendar(
      { ...data, routines: [{ ...routine, enabled: false }] },
      ['a'],
      '2026-11',
    ).entries,
  ).toHaveLength(0)
  const feeding = buildDustingCalendar(
    { ...data, routines: [{ ...routine, frequency: 'feeding' }] },
    ['a'],
    '2026-11',
  )
  expect(feeding.entries).toHaveLength(0)
  expect(feeding.reminders).toHaveLength(1)
  expect(
    buildDustingCalendar(
      { ...data, routines: [routine, { ...routine, id: 'second' }] },
      ['a'],
      '2026-11',
    ).entries.every((e) => e.overlap),
  ).toBe(true)
})
it('creates a landscape Letter calendar with overflow detail pages', async () => {
  const calendar = buildDustingCalendar(
    {
      ...data,
      routines: Array.from({ length: 8 }, (_, i) => ({
        ...routine,
        id: String(i),
        frequency: 'days',
        intervalCount: 1,
      })),
    },
    ['a'],
    '2026-11',
  )
  const pdf = await dustingPdf(calendar, {
    normal: readFileSync('public/fonts/Vera.ttf').toString('base64'),
    bold: readFileSync('public/fonts/VeraBd.ttf').toString('base64'),
  })
  expect(pdf.internal.pageSize.getWidth()).toBe(792)
  expect(pdf.internal.pageSize.getHeight()).toBe(612)
  expect(pdf.getNumberOfPages()).toBeGreaterThan(1)
  writeFileSync(
    '/private/tmp/orchard-dusting-qa.pdf',
    Buffer.from(pdf.output('arraybuffer')),
  )
})

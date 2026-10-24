import { describe, expect, it } from 'vitest'
import type { MediaAsset, NfcTag, Plant, Task } from '../../models'
import {
  collectionAttention,
  parseAttentionFilter,
} from './collectionAttention'
const now = new Date(2026, 9, 24, 14)
const plant = (id: string, fields: Partial<Plant> = {}): Plant => ({
  id,
  nickname: id,
  scientificName: id,
  status: 'active',
  kind: 'plant',
  favorite: false,
  createdAt: now,
  updatedAt: now,
  ...fields,
})
const task = (id: string, fields: Partial<Task> = {}): Task => ({
  id,
  title: id,
  type: 'water',
  status: 'open',
  priority: 'normal',
  createdAt: now,
  updatedAt: now,
  ...fields,
})
describe('needs attention classifications', () => {
  it('counts active plants only and uses real media/NFC assignments rather than hero placeholders', () => {
    const plants = [
      plant('missing', { heroImageUrl: '/placeholder.svg' }),
      plant('complete', { spaceId: 's', waterIntervalDays: 7 }),
      plant('archived', { status: 'archived' }),
    ]
    const media = [
      { plantId: 'complete' },
      { plantId: 'complete' },
    ] as MediaAsset[]
    const tags = [
      { resourceType: 'plant', resourceId: 'complete', publicToken: 'token' },
      { resourceType: 'space', resourceId: 'missing' },
      { resourceType: 'plant', resourceId: undefined },
    ] as NfcTag[]
    const result = collectionAttention(plants, media, tags, [], now)
    for (const key of ['noPhotos', 'noNfc', 'noLocation', 'noCare'] as const)
      expect([...result[key]]).toEqual(['missing'])
    expect(Object.values(result).every((ids) => !ids.has('archived'))).toBe(
      true,
    )
  })
  it('uses local calendar dates, excluding due-today and unknown care dates', () => {
    const plants = [
      plant('yesterday', {
        waterIntervalDays: 7,
        lastWateredAt: new Date(2026, 9, 16, 22),
      }),
      plant('today', {
        waterIntervalDays: 7,
        lastWateredAt: new Date(2026, 9, 17, 0),
      }),
      plant('unknown', { waterIntervalDays: 7 }),
      plant('disabled', {
        waterIntervalDays: 0,
        lastWateredAt: new Date(2026, 0, 1),
      }),
      plant('fertilize', {
        fertilizerIntervalDays: 14,
        lastFertilizedAt: new Date(2026, 9, 1),
      }),
    ]
    const result = collectionAttention(plants, [], [], [], now)
    expect([...result.overdueWater]).toEqual(['yesterday'])
    expect([...result.overdueFertilizer]).toEqual(['fertilize'])
    expect([...result.noCare]).toEqual(['disabled'])
  })
  it('counts shared and legacy tasks once per plant, ignores completed tasks and non-care tasks', () => {
    const plants = ['a', 'b', 'c', 'd', 'old'].map((id) =>
      plant(id, { status: id === 'old' ? 'archived' : 'active' }),
    )
    const due = new Date(2026, 9, 23)
    const tasks = [
      task('shared', {
        plantIds: ['a', 'b', 'a', 'old'],
        dueAt: due,
        recurrence: 'weekly',
      }),
      task('duplicate', { plantId: 'a', dueAt: due }),
      task('finished', { plantId: 'c', status: 'completed', dueAt: due }),
      task('repot', {
        plantId: 'c',
        type: 'repot',
        dueAt: due,
        recurrence: 'weekly',
      }),
      task('legacy', {
        plantId: 'd',
        type: 'fertilize',
        dueAt: due,
        recurrence: 'monthly',
      }),
    ]
    const result = collectionAttention(plants, [], [], tasks, now)
    expect([...result.overdueWater]).toEqual(['a', 'b'])
    expect([...result.overdueFertilizer]).toEqual(['d'])
    expect([...result.noCare]).toEqual(['c'])
  })
  it('uses managed task due dates instead of an outdated calculated profile date', () => {
    const p = plant('a', {
      waterIntervalDays: 7,
      lastWateredAt: new Date(2026, 8, 1),
    })
    expect(
      collectionAttention(
        [p],
        [],
        [],
        [
          task('managed', {
            plantId: 'a',
            careManaged: true,
            dueAt: new Date(2026, 9, 25),
          }),
        ],
        now,
      ).overdueWater.size,
    ).toBe(0)
    expect(
      collectionAttention(
        [p],
        [],
        [],
        [
          task('managed', {
            plantId: 'a',
            careManaged: true,
            dueAt: new Date(2026, 9, 22),
          }),
        ],
        now,
      ).overdueWater.has('a'),
    ).toBe(true)
  })
  it('is deterministic for empty collections and rejects unknown URL filters', () => {
    expect(
      Object.values(collectionAttention([], [], [], [], now)).every(
        (ids) => ids.size === 0,
      ),
    ).toBe(true)
    expect(parseAttentionFilter('noPhotos')).toBe('noPhotos')
    expect(parseAttentionFilter('invalid')).toBeUndefined()
    expect(parseAttentionFilter(null)).toBeUndefined()
  })
})

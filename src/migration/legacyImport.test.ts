import { describe, expect, it } from 'vitest'

import { hasLegacyData, legacyUuid } from './legacyImport'

describe('legacy import identity mapping', () => {
  it('preserves existing UUIDs', () => {
    const id = '0f4ca47b-6f51-4b22-8b49-37e39de81518'
    expect(legacyUuid('user-a', id)).toBe(id)
  })

  it('maps legacy string IDs deterministically and per account', () => {
    const first = legacyUuid('user-a', 'plant-monstera-albo')
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(legacyUuid('user-a', 'plant-monstera-albo')).toBe(first)
    expect(legacyUuid('user-b', 'plant-monstera-albo')).not.toBe(first)
  })

  it('detects importable data from any legacy entity group', () => {
    expect(
      hasLegacyData({
        plants: 0,
        spaces: 0,
        tasks: 0,
        timeline: 0,
        photos: 1,
        feederRecords: 0,
      }),
    ).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'

import type { Plant } from '../../models'
import { activePlants, filterCollectionPlants } from './plantFilters'

function plant(id: string, status: Plant['status']): Plant {
  const now = new Date('2026-08-03T12:00:00.000Z')
  return {
    id,
    nickname: id,
    scientificName: `${id} scientific`,
    kind: 'plant',
    status,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

describe('plant lifecycle filters', () => {
  const plants = [
    plant('active-plant', 'active'),
    plant('old-plant', 'archived'),
  ]

  it('hides archived plants from the default active view and search', () => {
    expect(filterCollectionPlants(plants, 'active', '')).toHaveLength(1)
    expect(filterCollectionPlants(plants, 'active', 'old-plant')).toEqual([])
  })

  it('supports Archived and All views', () => {
    expect(
      filterCollectionPlants(plants, 'archived', '').map(({ id }) => id),
    ).toEqual(['old-plant'])
    expect(filterCollectionPlants(plants, 'all', '')).toHaveLength(2)
  })

  it('excludes archived plants from active counts', () => {
    expect(activePlants(plants).map(({ id }) => id)).toEqual(['active-plant'])
  })
})

import { describe, expect, it } from 'vitest'

import type { Plant, Space } from '../../models'
import {
  collectionPrintValue,
  defaultCollectionPrintStatus,
  prepareCollectionPrintPlants,
  selectedCollectionPrintFields,
} from './collectionPrint'

const now = new Date('2026-09-05T12:00:00.000Z')
const spaces: Space[] = [
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    type: 'greenhouse',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'office',
    name: 'Office',
    type: 'room',
    createdAt: now,
    updatedAt: now,
  },
]

function plant(
  id: string,
  status: Plant['status'],
  overrides: Partial<Plant> = {},
): Plant {
  return {
    id,
    nickname: id,
    scientificName: `${id} species`,
    kind: 'plant',
    status,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('collection print report', () => {
  const plants = [
    plant('Zebra', 'active', {
      scientificName: 'Aphelandra squarrosa',
      spaceId: 'office',
      createdAt: new Date('2026-02-01'),
    }),
    plant('Fern', 'archived', {
      scientificName: 'Nephrolepis exaltata',
      spaceId: 'greenhouse',
      createdAt: new Date('2025-01-01'),
    }),
    plant('Aloe', 'active', {
      scientificName: 'Aloe vera',
      spaceId: 'greenhouse',
      createdAt: new Date('2026-01-01'),
    }),
  ]

  it('includes active plants by default and handles archived/all filters', () => {
    expect(defaultCollectionPrintStatus).toBe('active')
    expect(
      prepareCollectionPrintPlants(
        plants,
        spaces,
        defaultCollectionPrintStatus,
        'name',
      ).map(({ id }) => id),
    ).toEqual(['Aloe', 'Zebra'])
    expect(
      prepareCollectionPrintPlants(plants, spaces, 'archived', 'name').map(
        ({ id }) => id,
      ),
    ).toEqual(['Fern'])
    expect(
      prepareCollectionPrintPlants(plants, spaces, 'all', 'name'),
    ).toHaveLength(3)
  })

  it('sorts by botanical name, date added, and space', () => {
    expect(
      prepareCollectionPrintPlants(plants, spaces, 'all', 'botanical').map(
        ({ id }) => id,
      ),
    ).toEqual(['Aloe', 'Zebra', 'Fern'])
    expect(
      prepareCollectionPrintPlants(plants, spaces, 'all', 'createdAt').map(
        ({ id }) => id,
      ),
    ).toEqual(['Fern', 'Aloe', 'Zebra'])
    expect(
      prepareCollectionPrintPlants(plants, spaces, 'all', 'space').map(
        ({ id }) => id,
      ),
    ).toEqual(['Aloe', 'Fern', 'Zebra'])
  })

  it('returns only requested field values to the report layer', () => {
    const source = plants[0]!
    const selected = new Set(['genus', 'species', 'space'] as const)
    const fields = selectedCollectionPrintFields(selected)
    expect(
      fields.map(({ id }) => collectionPrintValue(source, id, spaces)),
    ).toEqual(['Aphelandra', 'squarrosa', 'Office'])
    expect(fields.map(({ id }) => id)).not.toContain('notes')
  })
})

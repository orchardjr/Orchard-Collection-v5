import { describe, expect, it } from 'vitest'

import type { MediaAsset, Plant } from '../../models'
import { filterAndSortMedia, selectPlantCardMedia } from './mediaSelectors'

const date = new Date('2026-01-01T00:00:00Z')
const plant = {
  id: 'plant-a',
  nickname: 'Albo',
  scientificName: 'Monstera deliciosa',
  kind: 'plant',
  status: 'active',
  favorite: false,
  createdAt: date,
  updatedAt: date,
} satisfies Plant
const asset = (
  id: string,
  overrides: Partial<MediaAsset> = {},
): MediaAsset => ({
  id,
  plantId: 'plant-a',
  fileName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  blob: new Blob(['x']),
  fileSize: 1,
  uploadedAt: date,
  isHero: false,
  isFavorite: false,
  tags: [],
  fingerprint: id,
  createdAt: date,
  updatedAt: date,
  ...overrides,
})

describe('media selectors', () => {
  it('chooses hero before a newer image and newest when no hero exists', () => {
    const newest = asset('new', { uploadedAt: new Date('2026-02-01') })
    const hero = asset('hero', { isHero: true })
    expect(selectPlantCardMedia([newest, hero])?.id).toBe('hero')
    expect(selectPlantCardMedia([asset('old'), newest])?.id).toBe('new')
  })

  it('searches names, notes, and tags and applies filters and sorting', () => {
    const favorite = asset('flower', {
      fileName: 'bloom.jpg',
      isFavorite: true,
      tags: ['spring'],
      dateTaken: new Date('2026-03-01'),
    })
    const other = asset('leaf', {
      notes: 'Propagation',
      uploadedAt: new Date('2026-04-01'),
      dateTaken: new Date('2026-02-01'),
    })
    expect(
      filterAndSortMedia([other, favorite], [plant], {
        search: 'monstera',
        plantId: '',
        favoritesOnly: false,
        sort: 'dateTaken',
      })[0]?.id,
    ).toBe('flower')
    expect(
      filterAndSortMedia([other, favorite], [plant], {
        search: 'spring',
        plantId: 'plant-a',
        favoritesOnly: true,
        sort: 'uploadedAt',
      }),
    ).toEqual([favorite])
  })
})

import { describe, expect, it } from 'vitest'
import type { MediaAsset, NfcTag, Plant, Space } from '../../models'
import { collectionAuditByPlant } from '../plants/collectionPrint'
import {
  labelEntries,
  labelLines,
  selectPlantLabelPlants,
  type PlantLabelSource,
} from './plantLabelSheets'
const now = new Date('2026-01-01')
const plants: Plant[] = ['C', 'A', 'B', 'Old'].map((id, i) => ({
  id,
  nickname: id,
  scientificName: ['Alpha', 'Gamma', 'Beta', 'Delta'][i]!,
  status: id === 'Old' ? 'archived' : 'active',
  kind: 'plant',
  favorite: false,
  createdAt: new Date(now.getTime() + i * 1000),
  updatedAt: now,
  spaceId: id === 'A' ? 'a' : 'z',
}))
const audit = collectionAuditByPlant(
  [{ resourceType: 'plant', resourceId: 'A', publicToken: 'code' } as NfcTag],
  [{ plantId: 'B' } as MediaAsset],
)
const spaces = [
  { id: 'a', name: 'A room' },
  { id: 'z', name: 'Z room' },
] as Space[]
describe('plant label selection and fields', () => {
  it.each([
    ['active', ['A', 'B', 'C']],
    ['selected', ['B', 'Old']],
    ['filtered', ['A', 'Old']],
    ['noNfc', ['B', 'C']],
    ['noPhotos', ['A', 'C']],
    ['either', ['A', 'B', 'C']],
    ['both', ['C']],
  ] as [PlantLabelSource, string[]][])(
    'reuses selection and audit logic for %s',
    (source, expected) => {
      expect(
        selectPlantLabelPlants(
          plants,
          spaces,
          audit,
          source,
          new Set(['B', 'Old']),
          new Set(['A', 'Old']),
          'name',
        ).map((p) => p.id),
      ).toEqual(expected)
    },
  )
  it('supports every sort without mutating plants', () => {
    const choose = (sort: 'botanical' | 'createdAt' | 'space' | 'id') =>
      selectPlantLabelPlants(
        plants,
        spaces,
        audit,
        'active',
        new Set(),
        new Set(),
        sort,
      ).map((p) => p.id)
    expect(choose('botanical')).toEqual(['C', 'B', 'A'])
    expect(choose('createdAt')).toEqual(['C', 'A', 'B'])
    expect(choose('space')).toEqual(['A', 'B', 'C'])
    expect(choose('id')).toEqual(['A', 'B', 'C'])
    expect(plants.map((p) => p.id)).toEqual(['C', 'A', 'B', 'Old'])
  })
  it('supports one to ten copies and selected fields only', () => {
    expect(labelEntries(plants, 10)).toHaveLength(40)
    for (const copies of [0, 11, 1.5, NaN])
      expect(() => labelEntries(plants, copies)).toThrow()
    expect(
      labelLines(
        plants[1]!,
        new Map([['a', 'A room']]),
        audit.get('A'),
        new Set(['nfc']),
      ),
    ).toEqual([{ text: 'NFC: code', bold: false }])
    expect(
      labelLines(
        { ...plants[1]!, cultivar: 'Alba' },
        new Map(),
        undefined,
        new Set(['botanical', 'cultivar']),
      )[0]!.text,
    ).toBe("Gamma 'Alba'")
  })
})

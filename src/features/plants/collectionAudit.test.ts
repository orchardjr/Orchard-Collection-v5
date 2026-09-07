import { describe, expect, it } from 'vitest'
import type { MediaAsset, NfcTag, Plant } from '../../models'
import {
  collectionAuditByPlant,
  collectionAuditSummary,
  collectionPrintValue,
  defaultCollectionPrintFields,
  prepareCollectionPrintPlants,
  selectedCollectionPrintFields,
  type CollectionAuditFilter,
} from './collectionPrint'
const now = new Date('2026-09-06')
const plants: Plant[] = ['both', 'nfc', 'photo', 'neither', 'archived'].map(
  (id) => ({
    id,
    nickname: id,
    scientificName: id,
    status: id === 'archived' ? 'archived' : 'active',
    kind: 'plant',
    favorite: false,
    createdAt: now,
    updatedAt: now,
    heroImageUrl: '/placeholder.svg',
  }),
)
const tags = [
  {
    id: 'a',
    resourceType: 'plant',
    resourceId: 'both',
    publicToken: 'token-a',
    uid: 'CODE-A',
  },
  { id: 'b', resourceType: 'plant', resourceId: 'nfc', publicToken: 'token-b' },
  {
    id: 'old',
    resourceType: 'plant',
    publicToken: 'old-token',
    nickname: 'neither',
  },
] as NfcTag[]
const media = [
  { id: 'a', plantId: 'both' },
  { id: 'b', plantId: 'photo' },
  { id: 'c', plantId: 'photo' },
] as MediaAsset[]
const audit = collectionAuditByPlant(tags, media)
describe('collection print completeness audit', () => {
  it.each([
    ['all', ['both', 'neither', 'nfc', 'photo']],
    ['noNfc', ['neither', 'photo']],
    ['noPhotos', ['neither', 'nfc']],
    ['either', ['neither', 'nfc', 'photo']],
    ['both', ['neither']],
  ] as [CollectionAuditFilter, string[]][])(
    'filters %s within active scope',
    (filter, ids) => {
      expect(
        prepareCollectionPrintPlants(
          plants,
          [],
          'active',
          'name',
          filter,
          audit,
        ).map((p) => p.id),
      ).toEqual(ids)
    },
  )
  it('combines archived/all scope with missing-both and preserves sorting', () => {
    expect(
      prepareCollectionPrintPlants(
        plants,
        [],
        'archived',
        'name',
        'both',
        audit,
      ).map((p) => p.id),
    ).toEqual(['archived'])
    expect(
      prepareCollectionPrintPlants(
        plants,
        [],
        'all',
        'botanical',
        'both',
        audit,
      ).map((p) => p.id),
    ).toEqual(['archived', 'neither'])
  })
  it('ignores placeholder hero URLs and unassigned/replaced NFC records', () => {
    expect(audit.get('neither')).toBeUndefined()
    expect(
      collectionPrintValue(plants[3]!, 'photoStatus', [], audit.get('neither')),
    ).toBe('No photos')
    expect(
      collectionPrintValue(plants[3]!, 'nfcStatus', [], audit.get('neither')),
    ).toBe('Not assigned')
    expect(audit.get('both')?.nfcCode).toBe('CODE-A')
    expect(audit.get('nfc')?.nfcCode).toBe('token-b')
  })
  it('counts only the final report plants, including zero-result reports', () => {
    const scoped = prepareCollectionPrintPlants(
      plants,
      [],
      'active',
      'name',
      'either',
      audit,
    )
    expect(collectionAuditSummary(scoped, audit)).toEqual({
      total: 3,
      withoutNfc: 2,
      withoutPhotos: 2,
      missingBoth: 1,
    })
    expect(collectionAuditSummary(plants, audit)).toEqual({
      total: 5,
      withoutNfc: 3,
      withoutPhotos: 3,
      missingBoth: 2,
    })
    expect(collectionAuditSummary([], audit).total).toBe(0)
  })
  it('makes NFC and photo fields opt-in with correct labels and pluralization', () => {
    expect(defaultCollectionPrintFields.has('nfcStatus')).toBe(false)
    expect(defaultCollectionPrintFields.has('photoStatus')).toBe(false)
    expect(
      selectedCollectionPrintFields(new Set(['nfcStatus', 'photoStatus'])),
    ).toEqual([
      { id: 'nfcStatus', label: 'NFC Status' },
      { id: 'photoStatus', label: 'Photo Status' },
    ])
    expect(
      collectionPrintValue(plants[0]!, 'nfcStatus', [], audit.get('both')),
    ).toBe('Assigned')
    expect(
      collectionPrintValue(plants[0]!, 'photoStatus', [], audit.get('both')),
    ).toBe('1 photo')
    expect(
      collectionPrintValue(plants[2]!, 'photoStatus', [], audit.get('photo')),
    ).toBe('2 photos')
  })
})

import type { MediaAsset, NfcTag, Plant, Space } from '../../models'
import type { PlantStatusFilter } from './plantFilters'

export type CollectionPrintSort = 'name' | 'botanical' | 'createdAt' | 'space'
export type CollectionAuditFilter =
  'all' | 'noNfc' | 'noPhotos' | 'either' | 'both'
export const collectionAuditFilters: {
  id: CollectionAuditFilter
  label: string
}[] = [
  { id: 'all', label: 'All plants' },
  { id: 'noNfc', label: 'No NFC assigned' },
  { id: 'noPhotos', label: 'No photos' },
  { id: 'either', label: 'No NFC OR no photos' },
  { id: 'both', label: 'No NFC AND no photos' },
]
export interface CollectionAuditStatus {
  nfcAssigned: boolean
  nfcCode?: string
  photoCount: number
}
export function collectionAuditByPlant(tags: NfcTag[], media: MediaAsset[]) {
  const result = new Map<string, CollectionAuditStatus>()
  const get = (id: string) => {
    if (!result.has(id)) result.set(id, { nfcAssigned: false, photoCount: 0 })
    return result.get(id)!
  }
  for (const tag of tags) {
    if (tag.resourceType === 'plant' && tag.resourceId) {
      get(tag.resourceId).nfcAssigned = true
      get(tag.resourceId).nfcCode = tag.uid || tag.publicToken
    }
  }
  for (const asset of media) get(asset.plantId).photoCount++
  return result
}
export function matchesCollectionAudit(
  status: CollectionAuditStatus | undefined,
  filter: CollectionAuditFilter,
) {
  const noNfc = !status?.nfcAssigned
  const noPhotos = !status?.photoCount
  return (
    filter === 'all' ||
    (filter === 'noNfc' && noNfc) ||
    (filter === 'noPhotos' && noPhotos) ||
    (filter === 'either' && (noNfc || noPhotos)) ||
    (filter === 'both' && noNfc && noPhotos)
  )
}
export function collectionAuditSummary(
  plants: Plant[],
  audit: ReadonlyMap<string, CollectionAuditStatus>,
) {
  return plants.reduce(
    (sum, plant) => {
      const status = audit.get(plant.id)
      sum.total++
      if (!status?.nfcAssigned) sum.withoutNfc++
      if (!status?.photoCount) sum.withoutPhotos++
      if (!status?.nfcAssigned && !status?.photoCount) sum.missingBoth++
      return sum
    },
    { total: 0, withoutNfc: 0, withoutPhotos: 0, missingBoth: 0 },
  )
}

export type CollectionPrintField =
  | 'displayName'
  | 'botanicalName'
  | 'genus'
  | 'species'
  | 'cultivar'
  | 'plantId'
  | 'space'
  | 'acquisitionDate'
  | 'vendor'
  | 'purchasePrice'
  | 'notes'
  | 'status'
  | 'tags'
  | 'nfcStatus'
  | 'photoStatus'

export const collectionPrintFields: Array<{
  id: CollectionPrintField
  label: string
}> = [
  { id: 'displayName', label: 'Display / common name' },
  { id: 'botanicalName', label: 'Botanical name' },
  { id: 'genus', label: 'Genus' },
  { id: 'species', label: 'Species' },
  { id: 'cultivar', label: 'Cultivar / variety' },
  { id: 'plantId', label: 'Accession / plant ID' },
  { id: 'space', label: 'Space / location' },
  { id: 'acquisitionDate', label: 'Acquisition date' },
  { id: 'vendor', label: 'Source / vendor' },
  { id: 'purchasePrice', label: 'Purchase price' },
  { id: 'notes', label: 'Notes' },
  { id: 'status', label: 'Status' },
  { id: 'tags', label: 'Tags' },
  { id: 'nfcStatus', label: 'NFC Status' },
  { id: 'photoStatus', label: 'Photo Status' },
]

export const defaultCollectionPrintFields = new Set<CollectionPrintField>(
  collectionPrintFields
    .filter(({ id }) => id !== 'nfcStatus' && id !== 'photoStatus')
    .map(({ id }) => id),
)

export const defaultCollectionPrintStatus: PlantStatusFilter = 'active'

export function selectedCollectionPrintFields(
  fields: ReadonlySet<CollectionPrintField>,
) {
  return collectionPrintFields.filter(({ id }) => fields.has(id))
}

type PrintablePlant = Plant & {
  accessionId?: string
  purchasePrice?: number
  tags?: string[]
  variety?: string
}

export function botanicalParts(scientificName: string) {
  const [genus = '', species = ''] = scientificName.trim().split(/\s+/)
  return { genus, species }
}

export function prepareCollectionPrintPlants(
  plants: Plant[],
  spaces: Space[],
  status: PlantStatusFilter,
  sort: CollectionPrintSort,
  auditFilter: CollectionAuditFilter = 'all',
  audit: ReadonlyMap<string, CollectionAuditStatus> = new Map(),
) {
  const spaceNames = new Map(spaces.map((space) => [space.id, space.name]))
  const filtered = plants.filter(
    (plant) =>
      (status === 'all' || plant.status === status) &&
      matchesCollectionAudit(audit.get(plant.id), auditFilter),
  )

  return [...filtered].sort((first, second) => {
    if (sort === 'createdAt')
      return first.createdAt.getTime() - second.createdAt.getTime()
    if (sort === 'space')
      return (
        compare(
          spaceNames.get(first.spaceId ?? '') ?? '',
          spaceNames.get(second.spaceId ?? '') ?? '',
        ) || compare(first.nickname, second.nickname)
      )
    if (sort === 'botanical')
      return (
        compare(first.scientificName, second.scientificName) ||
        compare(first.nickname, second.nickname)
      )
    return compare(
      first.nickname || first.commonName,
      second.nickname || second.commonName,
    )
  })
}

function compare(first = '', second = '') {
  return first.localeCompare(second, undefined, { sensitivity: 'base' })
}

export function collectionPrintValue(
  source: Plant,
  field: CollectionPrintField,
  spaces: Space[],
  audit?: CollectionAuditStatus,
) {
  const plant = source as PrintablePlant
  const { genus, species } = botanicalParts(plant.scientificName)
  const values: Record<CollectionPrintField, string> = {
    displayName: plant.nickname || plant.commonName || '',
    botanicalName: plant.scientificName,
    genus,
    species,
    cultivar: plant.cultivar ?? plant.variety ?? '',
    plantId: plant.accessionId ?? plant.id,
    space: spaces.find(({ id }) => id === plant.spaceId)?.name ?? '',
    acquisitionDate: plant.purchaseDate?.toLocaleDateString() ?? '',
    vendor: plant.vendor ?? '',
    purchasePrice:
      typeof plant.purchasePrice === 'number'
        ? new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'CAD',
          }).format(plant.purchasePrice)
        : '',
    notes: plant.notes ?? plant.careNotes ?? '',
    status: plant.status === 'active' ? 'Active' : 'Archived',
    tags: plant.tags?.join(', ') ?? '',
    nfcStatus: audit?.nfcAssigned ? 'Assigned' : 'Not assigned',
    photoStatus: audit?.photoCount
      ? `${audit.photoCount} ${audit.photoCount === 1 ? 'photo' : 'photos'}`
      : 'No photos',
  }
  return values[field]
}

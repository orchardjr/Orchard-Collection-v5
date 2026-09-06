import type { Plant, Space } from '../../models'
import type { PlantStatusFilter } from './plantFilters'

export type CollectionPrintSort = 'name' | 'botanical' | 'createdAt' | 'space'

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
]

export const defaultCollectionPrintFields = new Set<CollectionPrintField>(
  collectionPrintFields.map(({ id }) => id),
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
) {
  const spaceNames = new Map(spaces.map((space) => [space.id, space.name]))
  const filtered = plants.filter(
    (plant) => status === 'all' || plant.status === status,
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
  }
  return values[field]
}

import type { Plant, Space } from '../../models'
import {
  prepareCollectionPrintPlants,
  type CollectionAuditFilter,
  type CollectionAuditStatus,
} from '../plants/collectionPrint'
import { orchardPlantUrl } from './resolvePlantQrUrl'
import { isUuid } from '../../lib/isUuid'

export const labelFields = [
  { id: 'name', label: 'Plant/display name' },
  { id: 'botanical', label: 'Botanical name' },
  { id: 'cultivar', label: 'Cultivar/variety' },
  { id: 'id', label: 'Accession/Plant ID' },
  { id: 'nfc', label: 'NFC code/identifier' },
  { id: 'space', label: 'Space/location' },
] as const
export type PlantLabelField = (typeof labelFields)[number]['id']
export type PlantLabelSort = 'name' | 'botanical' | 'id' | 'space' | 'createdAt'
export type PlantLabelSource =
  'active' | 'selected' | 'filtered' | Exclude<CollectionAuditFilter, 'all'>
export interface LabelSelectionContext {
  selectedIds?: string[]
  filteredIds?: string[]
  initialSource?: PlantLabelSource
}
export interface PlantLabelOptions {
  fields: ReadonlySet<PlantLabelField>
  copies: number
  borders: boolean
  qr: boolean
  localOnly?: boolean
}
export const letterLabelLayout = (() => {
  const pageWidth = 612,
    pageHeight = 792,
    width = 180,
    height = 36
  const marginX = 27,
    marginY = 36,
    gapX = 9,
    gapY = 4.5
  const columns = Math.floor((pageWidth - 2 * marginX + gapX) / (width + gapX))
  const rows = Math.floor((pageHeight - 2 * marginY + gapY) / (height + gapY))
  return {
    pageWidth,
    pageHeight,
    width,
    height,
    marginX,
    marginY,
    gapX,
    gapY,
    columns,
    rows,
    perPage: columns * rows,
  }
})()
export const plantAccession = (plant: Plant) =>
  (plant as Plant & { accessionId?: string }).accessionId || plant.id
export function selectPlantLabelPlants(
  plants: Plant[],
  spaces: Space[],
  audit: ReadonlyMap<string, CollectionAuditStatus>,
  source: PlantLabelSource,
  selected: ReadonlySet<string>,
  filtered: ReadonlySet<string>,
  sort: PlantLabelSort,
) {
  const scope =
    source === 'selected'
      ? plants.filter((p) => selected.has(p.id))
      : source === 'filtered'
        ? plants.filter((p) => filtered.has(p.id))
        : plants
  const auditFilter =
    source === 'active' || source === 'selected' || source === 'filtered'
      ? 'all'
      : source
  const result = prepareCollectionPrintPlants(
    scope,
    spaces,
    source === 'selected' || source === 'filtered' ? 'all' : 'active',
    sort === 'id' ? 'name' : sort,
    auditFilter,
    audit,
  )
  return sort === 'id'
    ? result.sort((a, b) =>
        plantAccession(a).localeCompare(plantAccession(b), undefined, {
          numeric: true,
        }),
      )
    : result
}
export function labelEntries(plants: Plant[], copies: number) {
  if (!Number.isInteger(copies) || copies < 1 || copies > 10)
    throw new Error('Copies per plant must be 1 to 10.')
  return plants.flatMap((plant) => Array.from({ length: copies }, () => plant))
}
export function labelPosition(index: number) {
  const l = letterLabelLayout
  const slot = index % l.perPage
  return {
    page: Math.floor(index / l.perPage),
    x: l.marginX + (slot % l.columns) * (l.width + l.gapX),
    y: l.marginY + Math.floor(slot / l.columns) * (l.height + l.gapY),
    width: l.width,
    height: l.height,
  }
}
export function labelLines(
  plant: Plant,
  spaces: ReadonlyMap<string, string>,
  audit: CollectionAuditStatus | undefined,
  fields: ReadonlySet<PlantLabelField>,
) {
  const cultivar =
    plant.cultivar || (plant as Plant & { variety?: string }).variety
  const lines: { text: string; bold: boolean }[] = []
  if (fields.has('name')) {
    const name =
      plant.nickname ||
      plant.commonName ||
      plant.scientificName ||
      plantAccession(plant)
    lines.push({ text: name, bold: true })
  }
  const botanical = [
    fields.has('botanical') ? plant.scientificName : '',
    fields.has('cultivar') && cultivar ? `'${cultivar}'` : '',
  ]
    .filter(Boolean)
    .join(' ')
  if (botanical) lines.push({ text: botanical, bold: false })
  if (fields.has('id'))
    lines.push({ text: 'ID: ' + plantAccession(plant), bold: false })
  if (fields.has('nfc') && audit?.nfcAssigned && audit.nfcCode)
    lines.push({ text: 'NFC: ' + audit.nfcCode, bold: false })
  const location = spaces.get(plant.spaceId ?? '')
  if (fields.has('space') && location)
    lines.push({ text: location, bold: false })
  return lines
}
// Existing authenticated route; local-only IDs have no portable cloud target.
export const plantLabelQrUrl = (plant: Plant, localOnly = false) =>
  !localOnly && isUuid(plant.id) ? orchardPlantUrl(plant.id) : undefined

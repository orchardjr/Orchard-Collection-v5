import type { MediaAsset, Plant } from '../../models'

export type MediaSort = 'dateTaken' | 'uploadedAt' | 'plantName'

export function selectPlantCardMedia(assets: MediaAsset[]) {
  return [...assets].sort((a, b) => {
    if (a.isHero !== b.isHero) return a.isHero ? -1 : 1
    return b.uploadedAt.getTime() - a.uploadedAt.getTime()
  })[0]
}

interface MediaFilters {
  search: string
  plantId: string
  favoritesOnly: boolean
  sort: MediaSort
}

export function filterAndSortMedia(
  assets: MediaAsset[],
  plants: Plant[],
  filters: MediaFilters,
) {
  const names = new Map(
    plants.map((plant) => [
      plant.id,
      `${plant.nickname} ${plant.scientificName} ${plant.commonName ?? ''}`.toLowerCase(),
    ]),
  )
  const query = filters.search.trim().toLowerCase()
  return assets
    .filter((asset) => {
      const searchable =
        `${names.get(asset.plantId) ?? ''} ${asset.fileName} ${asset.notes ?? ''} ${asset.tags.join(' ')}`.toLowerCase()
      return (
        (!query || searchable.includes(query)) &&
        (!filters.plantId || asset.plantId === filters.plantId) &&
        (!filters.favoritesOnly || asset.isFavorite)
      )
    })
    .sort((a, b) => {
      if (filters.sort === 'plantName')
        return (names.get(a.plantId) ?? '').localeCompare(
          names.get(b.plantId) ?? '',
        )
      const aDate =
        filters.sort === 'dateTaken'
          ? (a.dateTaken ?? a.uploadedAt)
          : a.uploadedAt
      const bDate =
        filters.sort === 'dateTaken'
          ? (b.dateTaken ?? b.uploadedAt)
          : b.uploadedAt
      return bDate.getTime() - aDate.getTime()
    })
}

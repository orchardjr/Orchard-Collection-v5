import type { Plant } from '../../models'

export type PlantStatusFilter = 'active' | 'archived' | 'all'

export function activePlants(plants: Plant[]) {
  return plants.filter((plant) => plant.status === 'active')
}

export function filterCollectionPlants(
  plants: Plant[],
  filter: PlantStatusFilter,
  search: string,
) {
  const query = search.trim().toLocaleLowerCase()
  return plants.filter((plant) => {
    const matchesStatus = filter === 'all' || plant.status === filter
    const matchesSearch =
      !query ||
      [
        plant.nickname,
        plant.scientificName,
        plant.commonName,
        plant.cultivar,
      ].some((value) => value?.toLocaleLowerCase().includes(query))
    return matchesStatus && matchesSearch
  })
}

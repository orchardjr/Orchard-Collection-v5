import type { Plant } from '../models'

export function getPlantDisplayName(plant: Plant) {
  return plant.nickname || plant.commonName || plant.scientificName
}

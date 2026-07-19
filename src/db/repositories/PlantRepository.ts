import type { Plant } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class PlantRepository extends BaseRepository<Plant> {
  constructor() {
    super(db.plants)
  }
}

export const plantRepository = new PlantRepository()

import type { Space } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class SpaceRepository extends BaseRepository<Space> {
  constructor() {
    super(db.spaces)
  }
}

export const spaceRepository = new SpaceRepository()

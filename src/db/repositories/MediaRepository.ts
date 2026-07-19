import type { MediaAsset } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class MediaRepository extends BaseRepository<MediaAsset> {
  constructor() {
    super(db.media)
  }
}

export const mediaRepository = new MediaRepository()

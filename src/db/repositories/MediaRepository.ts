import type { MediaAsset } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class MediaRepository extends BaseRepository<MediaAsset> {
  constructor() {
    super(db.media)
  }

  async getByPlantId(plantId: string): Promise<MediaAsset[]> {
    const media = await db.media
      .where('plantId')
      .equals(plantId)
      .sortBy('capturedAt')
    return media.reverse()
  }
}

export const mediaRepository = new MediaRepository()

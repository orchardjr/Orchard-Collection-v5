import type { CreateInput } from './BaseRepository'
import type { MediaAsset } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'
import { createId } from '../../lib/createId'

export class MediaRepository extends BaseRepository<MediaAsset> {
  constructor() {
    super(db.media)
  }

  async getByPlantId(plantId: string): Promise<MediaAsset[]> {
    const media = await db.media
      .where('plantId')
      .equals(plantId)
      .sortBy('uploadedAt')
    return media.reverse()
  }

  getByFingerprint(fingerprint: string): Promise<MediaAsset | undefined> {
    return db.media.where('fingerprint').equals(fingerprint).first()
  }

  override async create(input: CreateInput<MediaAsset>): Promise<MediaAsset> {
    return db.transaction('rw', db.media, async () => {
      if (input.isHero) {
        const current = await db.media
          .where('plantId')
          .equals(input.plantId)
          .filter((asset) => asset.isHero)
          .toArray()
        await Promise.all(
          current.map((asset) =>
            db.media.update(asset.id, { isHero: false, updatedAt: new Date() }),
          ),
        )
      }
      return super.create(input)
    })
  }

  async createMany(
    inputs: Array<CreateInput<MediaAsset>>,
  ): Promise<MediaAsset[]> {
    return db.transaction('rw', db.media, async () => {
      const heroIndexes = new Map<string, number>()
      inputs.forEach((input, index) => {
        if (input.isHero) heroIndexes.set(input.plantId, index)
      })
      const currentHeroes = await Promise.all(
        [...heroIndexes.keys()].map((plantId) =>
          db.media
            .where('plantId')
            .equals(plantId)
            .filter((asset) => asset.isHero)
            .toArray(),
        ),
      )
      await Promise.all(
        currentHeroes
          .flat()
          .map((asset) =>
            db.media.update(asset.id, { isHero: false, updatedAt: new Date() }),
          ),
      )
      const records = inputs.map((input, index) => {
        const now = new Date()
        return {
          ...input,
          isHero: heroIndexes.get(input.plantId) === index,
          id: createId(),
          createdAt: now,
          updatedAt: now,
        } as MediaAsset
      })
      await db.media.bulkAdd(records)
      return records
    })
  }

  async setHero(plantId: string, mediaId: string): Promise<void> {
    await db.transaction('rw', db.media, async () => {
      const assets = await db.media.where('plantId').equals(plantId).toArray()
      if (!assets.some((asset) => asset.id === mediaId))
        throw new Error('Media asset does not belong to this plant.')
      await Promise.all(
        assets.map((asset) =>
          db.media.update(asset.id, {
            isHero: asset.id === mediaId,
            updatedAt: new Date(),
          }),
        ),
      )
    })
  }

  async toggleFavorite(id: string): Promise<MediaAsset | undefined> {
    const asset = await this.getById(id)
    return asset
      ? this.update(id, { isFavorite: !asset.isFavorite })
      : undefined
  }

  updateNotes(id: string, notes: string): Promise<MediaAsset | undefined> {
    return this.update(id, { notes: notes.trim() || undefined })
  }

  updateTags(id: string, tags: string[]): Promise<MediaAsset | undefined> {
    return this.update(id, {
      tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
    })
  }

  override async delete(id: string): Promise<void> {
    await db.transaction('rw', db.media, async () => {
      const asset = await this.getById(id)
      if (!asset) return
      await db.media.delete(id)
      if (asset.isHero) {
        const remaining = (await this.getByPlantId(asset.plantId))[0]
        if (remaining)
          await db.media.update(remaining.id, {
            isHero: true,
            updatedAt: new Date(),
          })
      }
    })
  }
}

export const mediaRepository = new MediaRepository()

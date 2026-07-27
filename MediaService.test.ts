import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/database'
import type { CreateInput } from '../db/repositories'
import { timelineRepository } from '../db/repositories'
import type { MediaAsset } from '../models'
import { MediaService } from './MediaService'

describe('MediaService', () => {
  const plantId = 'media-service-plant'

  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.timeline.clear(),
      db.plants.clear(),
    ])
    const now = new Date()
    await db.plants.add({
      id: plantId,
      nickname: 'Test plant',
      scientificName: 'Monstera test',
      kind: 'plant',
      status: 'active',
      favorite: false,
      createdAt: now,
      updatedAt: now,
    })
  })

  it('continues a batch after a file fails and creates one meaningful event', async () => {
    const service = new MediaService(async (file, ownerId, isHero) => {
      if (file.name === 'bad.txt') throw new Error('Unsupported image format.')
      return {
        plantId: ownerId,
        fileName: file.name,
        mimeType: file.type,
        blob: file,
        fileSize: file.size,
        uploadedAt: new Date(),
        isHero,
        isFavorite: false,
        tags: [],
        fingerprint: file.name,
      } satisfies CreateInput<MediaAsset>
    })
    const files = [
      new File(['a'], 'good.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'bad.txt', { type: 'text/plain' }),
      new File(['c'], 'also-good.png', { type: 'image/png' }),
    ]
    const results = await service.importFiles(plantId, files)

    expect(results.map((result) => result.success)).toEqual([true, false, true])
    expect(await db.media.where('plantId').equals(plantId).count()).toBe(2)
    const events = await timelineRepository.getByPlantId(plantId)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      title: 'Multiple photos added',
      eventType: 'media',
      metadata: { count: 2 },
    })
  })

  it('records hero, favorite, notes, and delete timeline activity', async () => {
    const service = new MediaService(async (file, ownerId, isHero) => ({
      plantId: ownerId,
      fileName: file.name,
      mimeType: file.type,
      blob: file,
      fileSize: file.size,
      uploadedAt: new Date(),
      isHero,
      isFavorite: false,
      tags: [],
      fingerprint: file.name,
    }))
    const [result] = await service.importFiles(plantId, [
      new File(['a'], 'photo.jpg', { type: 'image/jpeg' }),
    ])
    expect(result).toBeDefined()
    if (!result) throw new Error('Expected an import result')
    const media = result.asset
    expect(media).toBeDefined()
    if (!media) return
    await service.setHero(media)
    const favorite = await service.toggleFavorite(media)
    if (favorite) await service.updateNotes(favorite, 'A meaningful update')
    await service.delete(media)
    const titles = (await timelineRepository.getByPlantId(plantId)).map(
      (event) => event.title,
    )
    expect(titles).toEqual(
      expect.arrayContaining([
        'Photo added',
        'Hero image changed',
        'Photo favorited',
        'Photo notes updated',
        'Photo deleted',
      ]),
    )
  })
})

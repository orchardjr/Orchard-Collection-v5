import { beforeEach, describe, expect, it } from 'vitest'
import { Blob as NodeBlob } from 'node:buffer'

import { db } from '../database'
import type { CreateInput } from './BaseRepository'
import type { MediaAsset } from '../../models'
import { mediaRepository } from './MediaRepository'

function input(
  plantId: string,
  name: string,
  hero = false,
): CreateInput<MediaAsset> {
  return {
    plantId,
    fileName: name,
    mimeType: 'image/jpeg',
    blob: new Blob(['photo'], { type: 'image/jpeg' }),
    thumbnailBlob: new Blob(['thumbnail'], { type: 'image/webp' }),
    fileSize: 5,
    uploadedAt: new Date(),
    isHero: hero,
    isFavorite: false,
    tags: [],
    fingerprint: `${plantId}-${name}`,
  }
}

describe('MediaRepository', () => {
  beforeEach(async () => {
    await db.media.clear()
  })

  it('supports CRUD and plant-scoped reads', async () => {
    const original = new NodeBlob(['photo'], { type: 'image/jpeg' }) as Blob
    const thumbnail = new NodeBlob(['thumbnail'], {
      type: 'image/webp',
    }) as Blob
    const created = await mediaRepository.create({
      ...input('plant-a', 'leaf.jpg'),
      blob: original,
      thumbnailBlob: thumbnail,
    })
    expect(await mediaRepository.getById(created.id)).toMatchObject({
      fileName: 'leaf.jpg',
    })
    expect((await mediaRepository.getById(created.id))?.blob).toMatchObject({
      size: 5,
      type: 'image/jpeg',
    })
    expect(
      (await mediaRepository.getById(created.id))?.thumbnailBlob,
    ).toMatchObject({
      size: 9,
      type: 'image/webp',
    })
    expect(await mediaRepository.getByPlantId('plant-a')).toHaveLength(1)
    expect(
      (await mediaRepository.update(created.id, { notes: 'New leaf' }))?.notes,
    ).toBe('New leaf')
    await mediaRepository.delete(created.id)
    expect(await mediaRepository.getById(created.id)).toBeUndefined()
  })

  it('selects exactly one hero atomically', async () => {
    const [first, second] = await mediaRepository.createMany([
      input('plant-a', 'one.jpg', true),
      input('plant-a', 'two.jpg'),
    ])
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    if (!first || !second) throw new Error('Expected two media records')
    await mediaRepository.setHero('plant-a', second.id)
    const assets = await mediaRepository.getByPlantId('plant-a')
    expect(
      assets.filter((asset) => asset.isHero).map((asset) => asset.id),
    ).toEqual([second.id])
    expect((await mediaRepository.getById(first.id))?.isHero).toBe(false)
  })

  it('promotes the newest remaining photo when deleting a hero', async () => {
    const hero = await mediaRepository.create(
      input('plant-a', 'hero.jpg', true),
    )
    const replacement = await mediaRepository.create(
      input('plant-a', 'newest.jpg'),
    )
    await mediaRepository.delete(hero.id)
    expect((await mediaRepository.getById(replacement.id))?.isHero).toBe(true)
  })
})

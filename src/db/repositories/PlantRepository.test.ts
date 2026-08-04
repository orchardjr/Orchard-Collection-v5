import { beforeAll, describe, expect, it, vi } from 'vitest'

import { ensureSeedData } from '../seed'
import { db } from '../database'
import { plantService } from '../../services/PlantService'
import { localNfcTagRepository } from './NfcTagRepository'
import { mediaRepository } from './MediaRepository'
import { plantRepository } from './PlantRepository'
import { taskRepository } from './TaskRepository'
import { timelineRepository } from './TimelineRepository'

describe('PlantRepository', () => {
  beforeAll(async () => {
    await ensureSeedData()
  })

  it('supports create, read, update, and delete operations', async () => {
    const created = await plantRepository.create({
      nickname: 'Hearts',
      scientificName: 'Ceropegia woodii',
      kind: 'plant',
      status: 'active',
      favorite: false,
      purchaseDate: new Date('2026-07-18T12:00:00.000Z'),
    })

    expect(await plantRepository.getById(created.id)).toMatchObject({
      nickname: 'Hearts',
    })
    expect(
      (await plantRepository.getAll()).some((plant) => plant.id === created.id),
    ).toBe(true)

    const updated = await plantRepository.update(created.id, { favorite: true })
    expect(updated?.favorite).toBe(true)

    await plantRepository.delete(created.id)
    expect(await plantRepository.getById(created.id)).toBeUndefined()
  })

  it('logs plant changes and archives without deleting the record', async () => {
    const plant = await plantService.create({
      nickname: 'Test Fern',
      scientificName: 'Nephrolepis exaltata',
      kind: 'plant',
      status: 'active',
      favorite: false,
    })

    await plantService.update(plant.id, { vendor: 'Orchard Nursery' })
    await plantService.archive(plant.id)

    const archived = await plantRepository.getById(plant.id)
    const events = (await timelineRepository.getAll()).filter(
      (event) => event.plantId === plant.id,
    )

    expect(archived?.status).toBe('archived')
    await plantService.restore(plant.id)
    expect((await plantRepository.getById(plant.id))?.status).toBe('active')
    const titles = events.map((event) => event.title)
    expect(titles).toContain('Plant created')
    expect(titles).toContain('Plant updated')
    expect(titles).toContain('Plant archived')
    expect(
      (await timelineRepository.getByPlantId(plant.id)).map(
        (event) => event.title,
      ),
    ).toContain('Plant restored')
  })

  it('permanently deletes a plant and its dependent local data', async () => {
    const now = new Date()
    const sharedSpaceId = `shared-space-${crypto.randomUUID()}`
    const sharedTemplateId = `shared-template-${crypto.randomUUID()}`
    await db.spaces.add({
      id: sharedSpaceId,
      name: 'Shared greenhouse',
      type: 'greenhouse',
      createdAt: now,
      updatedAt: now,
    })
    await db.labelTemplates.add({
      id: sharedTemplateId,
      name: 'Shared label',
      widthIn: 2,
      heightIn: 1,
      fields: ['plantName'],
      customFields: [],
      fontScale: 1,
      qrSizeIn: 0.5,
      barcodeHeightIn: 0.25,
      createdAt: now,
      updatedAt: now,
    })
    const plant = await plantService.create({
      nickname: 'Delete me',
      scientificName: 'Plantus deletus',
      kind: 'plant',
      status: 'active',
      favorite: false,
    })
    await mediaRepository.create({
      plantId: plant.id,
      fileName: 'delete.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1,
      uploadedAt: new Date(),
      isHero: true,
      isFavorite: false,
      tags: [],
      fingerprint: `delete-${plant.id}`,
    })
    await taskRepository.create({
      plantId: plant.id,
      title: 'Plant-only task',
      priority: 'normal',
      status: 'open',
      type: 'custom',
    })
    await localNfcTagRepository.assignTag({
      resourceType: 'plant',
      resourceId: plant.id,
    })

    await plantService.deletePermanently(plant.id)

    expect(await plantRepository.getById(plant.id)).toBeUndefined()
    expect(await mediaRepository.getByPlantId(plant.id)).toEqual([])
    expect(await taskRepository.getByPlantId(plant.id)).toEqual([])
    expect(await timelineRepository.getByPlantId(plant.id)).toEqual([])
    expect(await db.nfcTags.where('resourceId').equals(plant.id).count()).toBe(
      0,
    )
    expect(await db.spaces.get(sharedSpaceId)).toBeDefined()
    expect(await db.labelTemplates.get(sharedTemplateId)).toBeDefined()
  })

  it('completes transactional writes without crypto.randomUUID', async () => {
    const originalCrypto = globalThis.crypto
    vi.stubGlobal('crypto', {
      getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
    })
    try {
      const plant = await plantService.create({
        nickname: 'Safari Fern',
        scientificName: 'Nephrolepis safari',
        kind: 'plant',
        status: 'active',
        favorite: false,
      })
      const updated = await plantService.update(plant.id, { favorite: true })
      expect(updated?.favorite).toBe(true)
      expect(
        (await timelineRepository.getByPlantId(plant.id))
          .map((event) => event.title)
          .sort(),
      ).toEqual(['Plant created', 'Plant updated'])
    } finally {
      vi.stubGlobal('crypto', originalCrypto)
    }
  })
})

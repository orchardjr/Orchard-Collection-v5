import { beforeAll, describe, expect, it, vi } from 'vitest'

import { ensureSeedData } from '../seed'
import { plantService } from '../../services/PlantService'
import { plantRepository } from './PlantRepository'
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
    const titles = events.map((event) => event.title)
    expect(titles).toContain('Plant created')
    expect(titles.filter((title) => title === 'Plant updated')).toHaveLength(2)
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
        (await timelineRepository.getByPlantId(plant.id)).map(
          (event) => event.title,
        ),
      ).toEqual(['Plant updated', 'Plant created'])
    } finally {
      vi.stubGlobal('crypto', originalCrypto)
    }
  })
})

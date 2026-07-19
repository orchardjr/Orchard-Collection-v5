import { beforeAll, describe, expect, it } from 'vitest'

import { ensureSeedData } from '../seed'
import { plantRepository } from './PlantRepository'

describe('PlantRepository', () => {
  beforeAll(async () => {
    await ensureSeedData()
  })

  it('supports create, read, update, and delete operations', async () => {
    const created = await plantRepository.create({
      commonName: 'String of Hearts',
      scientificName: 'Ceropegia woodii',
      kind: 'plant',
      status: 'stable',
      acquiredAt: new Date('2026-07-18T12:00:00.000Z'),
    })

    expect(await plantRepository.getById(created.id)).toMatchObject({
      commonName: 'String of Hearts',
    })
    expect(
      (await plantRepository.getAll()).some((plant) => plant.id === created.id),
    ).toBe(true)

    const updated = await plantRepository.update(created.id, {
      status: 'thriving',
    })
    expect(updated?.status).toBe('thriving')

    await plantRepository.delete(created.id)
    expect(await plantRepository.getById(created.id)).toBeUndefined()
  })
})

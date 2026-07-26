import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/database'
import { PlantRepository } from '../db/repositories/PlantRepository'
import {
  canUseLocalReadFallback,
  readWithLocalFallback,
} from './readWithLocalFallback'

describe('readWithLocalFallback', () => {
  const localPlants = new PlantRepository()

  beforeEach(async () => {
    if (!db.isOpen()) await db.open()
    await db.plants.clear()
  })

  it('opens Dexie and returns local collections after a forbidden organizations response', async () => {
    await localPlants.create({
      nickname: 'Local Monstera',
      scientificName: 'Monstera deliciosa',
      kind: 'plant',
      status: 'active',
      favorite: false,
    })
    await db.close()

    const plants = await readWithLocalFallback(
      () =>
        Promise.reject({
          status: 403,
          message: 'GET /organizations returned Forbidden',
        }),
      () => localPlants.getAll(),
      true,
    )

    expect(db.isOpen()).toBe(true)
    expect(plants).toHaveLength(1)
    expect(plants[0]?.nickname).toBe('Local Monstera')
  })

  it('recognizes wrapped RLS and network failures as recoverable reads', () => {
    expect(
      canUseLocalReadFallback(
        new Error('Cloud read failed', {
          cause: { code: '42501', message: 'permission denied' },
        }),
      ),
    ).toBe(true)
    expect(canUseLocalReadFallback(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('does not hide invalid-query errors', async () => {
    await expect(
      readWithLocalFallback(
        () => Promise.reject({ status: 400, message: 'Invalid column' }),
        () => Promise.resolve(['local']),
        true,
      ),
    ).rejects.toMatchObject({ status: 400 })
  })
})

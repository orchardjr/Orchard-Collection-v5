import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../db/database'
import { PlantRepository } from '../db/repositories/PlantRepository'
import { repositoryError } from './SupabaseRepository'
import {
  canUseLocalReadFallback,
  readWithLocalFallback,
} from './readWithLocalFallback'

describe('readWithLocalFallback', () => {
  const localPlants = new PlantRepository()

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    sessionStorage.clear()
    window.history.replaceState({}, '', '/collection')
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
      { repository: 'plants', operation: 'getAll' },
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

  it('falls back for the production-friendly repository error shape', async () => {
    const cloudError = repositoryError(
      'read',
      {
        code: '42501',
        message: 'permission denied for table plants',
        details: 'RLS policy rejected the user',
        hint: 'Verify auth.uid()',
      },
      false,
    )

    await expect(
      readWithLocalFallback(
        () => Promise.reject(cloudError),
        () => Promise.resolve(['local plant']),
        true,
        { repository: 'plants', operation: 'getAll' },
      ),
    ).resolves.toEqual(['local plant'])
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

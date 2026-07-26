import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/database'
import { PlantRepository } from '../db/repositories/PlantRepository'
import {
  enableLocalCollectionMode,
  isLocalCollectionMode,
  localCollectionUrl,
} from './localCollectionMode'

describe('local collection recovery', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    window.history.replaceState({}, '', '/collection')
    if (!db.isOpen()) await db.open()
    await db.plants.clear()
  })

  it('explicitly opens Dexie and loads local records without cloud reads', async () => {
    const plants = new PlantRepository()
    await plants.create({
      nickname: 'Recovered Albo',
      scientificName: 'Monstera deliciosa',
      kind: 'plant',
      status: 'active',
      favorite: false,
    })
    db.close()

    const summary = await enableLocalCollectionMode()

    expect(db.isOpen()).toBe(true)
    expect(summary.plants).toBe(1)
    expect(isLocalCollectionMode()).toBe(true)
    expect(localCollectionUrl()).toBe('/collection?source=local')
  })

  it('supports URL-only recovery for Safari private browsing', () => {
    window.history.replaceState({}, '', '/collection?source=local')
    expect(isLocalCollectionMode()).toBe(true)
  })
})

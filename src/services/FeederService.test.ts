import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { FeederService } from './FeederService'

const service = new FeederService()
const colony = {
  name: 'Discoids',
  speciesId: 'species-1',
  type: 'discoid-breeder' as const,
  status: 'active' as const,
  dateStarted: new Date('2026-07-01'),
  binId: 'BIN-1',
}
describe('FeederService', () => {
  beforeEach(async () => {
    await Promise.all([
      db.feederColonies.clear(),
      db.cricketBatches.clear(),
      db.feederInventory.clear(),
      db.inventoryTransactions.clear(),
      db.feedingLogs.clear(),
      db.harvestLogs.clear(),
    ])
  })
  it('creates colonies with unique generated IDs', async () => {
    const first = await service.createColony(colony)
    const second = await service.createColony({ ...colony, name: 'Grow out' })
    expect(first.colonyId).toBe('DR-B-001')
    expect(second.colonyId).toBe('DR-B-002')
    await expect(
      db.feederColonies.add({ ...first, id: 'duplicate' }),
    ).rejects.toBeDefined()
  })
  it('creates cricket batches and calculates hatch date', async () => {
    const batch = await service.createBatch({
      stage: 'incubating',
      size: 'egg',
      quantity: 100,
      binId: 'CR-1',
      eggsMovedAt: new Date('2026-07-01T12:00:00Z'),
      incubationDays: 10,
    })
    expect(batch.batchId).toBe('CR-E-001')
    expect(batch.estimatedHatchAt?.toISOString()).toBe(
      '2026-07-11T12:00:00.000Z',
    )
  })
  it('logs additions/removals permanently and prevents negative inventory', async () => {
    const item = await service.createInventory(
      {
        speciesId: 'species-1',
        size: 'medium',
        unit: 'count',
        storageBin: 'F-1',
        dateAdded: new Date(),
        minimumStock: 10,
        status: 'available',
      },
      25,
    )
    await service.adjustInventory(item.id, 'feed-out', -20)
    expect((await db.feederInventory.get(item.id))?.quantity).toBe(5)
    expect(
      await db.inventoryTransactions
        .where('inventoryId')
        .equals(item.id)
        .count(),
    ).toBe(2)
    await expect(
      service.adjustInventory(item.id, 'remove', -6),
    ).rejects.toThrow('negative')
  })
  it('subtracts feeding use and turns harvests into inventory transactions', async () => {
    const item = await service.createInventory(
      {
        speciesId: 'species-1',
        size: 'small',
        unit: 'count',
        storageBin: 'F-2',
        dateAdded: new Date(),
        minimumStock: 5,
        status: 'available',
      },
      20,
    )
    await service.logFeeding({
      occurredAt: new Date(),
      speciesId: 'species-1',
      size: 'small',
      quantityOffered: 8,
      quantityEaten: 6,
      inventoryId: item.id,
      supplements: [],
    })
    await service.logHarvest({
      harvestId: 'HAR-001',
      occurredAt: new Date(),
      speciesId: 'species-1',
      size: 'small',
      quantity: 10,
      unit: 'count',
      destination: 'inventory',
      inventoryId: item.id,
    })
    expect((await db.feederInventory.get(item.id))?.quantity).toBe(24)
    expect(
      (
        await db.inventoryTransactions
          .where('inventoryId')
          .equals(item.id)
          .toArray()
      )
        .map((t) => t.action)
        .sort(),
    ).toEqual(['add', 'feed-out', 'harvest-in'].sort())
  })
})

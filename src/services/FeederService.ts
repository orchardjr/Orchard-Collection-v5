import { db } from '../db/database'
import type { CreateInput } from '../db/repositories'
import {
  cricketBatchRepository,
  feederColonyRepository,
  feederInventoryRepository,
  feedingLogRepository,
  harvestLogRepository,
  inventoryTransactionRepository,
  maintenanceLogRepository,
} from '../db/repositories'
import {
  colonyPrefix,
  estimatedHatchDate,
  nextRecordCode,
} from '../features/feeders/feederLogic'
import type {
  BatchStage,
  CricketBatch,
  FeederColony,
  FeederInventoryItem,
  FeedingLog,
  HarvestLog,
  InventoryAction,
  MaintenanceLog,
} from '../models'

export class FeederService {
  async createColony(
    input: Omit<CreateInput<FeederColony>, 'colonyId' | 'qrValue'>,
  ) {
    return db.transaction('rw', db.feederColonies, async () => {
      const code = nextRecordCode(
        colonyPrefix(input.type),
        (await db.feederColonies.toArray()).map((item) => item.colonyId),
      )
      return feederColonyRepository.create({
        ...input,
        colonyId: code,
        qrValue: `orchard:colony:${code}`,
      })
    })
  }
  updateColony(
    id: string,
    input: Partial<
      Omit<
        FeederColony,
        'id' | 'colonyId' | 'qrValue' | 'createdAt' | 'updatedAt'
      >
    >,
  ) {
    return feederColonyRepository.update(id, input)
  }
  archiveColony(id: string) {
    return feederColonyRepository.update(id, {
      status: 'retired',
      archivedAt: new Date(),
    })
  }
  reopenColony(id: string) {
    return feederColonyRepository.update(id, {
      status: 'active',
      archivedAt: undefined,
    })
  }
  async createBatch(
    input: Omit<
      CreateInput<CricketBatch>,
      'batchId' | 'qrValue' | 'estimatedHatchAt'
    > & { incubationDays?: number },
  ) {
    if (!input.parentColonyId)
      throw new Error('Choose a parent cricket breeder colony.')
    const parent = await feederColonyRepository.getById(input.parentColonyId)
    if (!parent || parent.type !== 'cricket-breeder' || parent.archivedAt)
      throw new Error('Parent must be an active cricket breeder colony.')
    const prefix =
      input.stage === 'eggs-collected' || input.stage === 'incubating'
        ? 'CR-E'
        : input.stage === 'pinheads'
          ? 'CR-P'
          : 'CR-G'
    const code = nextRecordCode(
      prefix,
      (await db.cricketBatches.toArray()).map((item) => item.batchId),
    )
    const { incubationDays = 10, ...record } = input
    return cricketBatchRepository.create({
      ...record,
      batchId: code,
      qrValue: `orchard:cricket:${code}`,
      estimatedHatchAt: record.eggsMovedAt
        ? estimatedHatchDate(record.eggsMovedAt, incubationDays)
        : undefined,
    })
  }
  async updateBatchStage(id: string, stage: BatchStage) {
    const batch = await cricketBatchRepository.getById(id)
    if (!batch) throw new Error('Cricket batch not found.')
    const now = new Date()
    return cricketBatchRepository.update(id, {
      stage,
      size:
        stage === 'pinheads'
          ? 'pinhead'
          : ['small', 'medium', 'large', 'adult'].includes(stage)
            ? (stage as CricketBatch['size'])
            : batch.size,
      firstHatchAt:
        stage === 'hatching' && !batch.firstHatchAt ? now : batch.firstHatchAt,
      mainHatchAt:
        stage === 'pinheads' && !batch.mainHatchAt ? now : batch.mainHatchAt,
    })
  }
  async adjustInventory(
    inventoryId: string,
    action: InventoryAction,
    delta: number,
    notes?: string,
  ) {
    if (!Number.isFinite(delta) || delta === 0)
      throw new Error('Adjustment must be a non-zero number.')
    return db.transaction(
      'rw',
      db.feederInventory,
      db.inventoryTransactions,
      async () => {
        const item = await db.feederInventory.get(inventoryId)
        if (!item) throw new Error('Inventory item not found.')
        const balance = item.quantity + delta
        if (balance < 0) throw new Error('Inventory cannot be negative.')
        await feederInventoryRepository.update(item.id, {
          quantity: balance,
          status:
            balance === 0
              ? 'depleted'
              : balance <= item.minimumStock
                ? 'low-stock'
                : item.status === 'depleted' || item.status === 'low-stock'
                  ? 'available'
                  : item.status,
        })
        return inventoryTransactionRepository.create({
          inventoryId,
          action,
          quantityDelta: delta,
          balanceAfter: balance,
          occurredAt: new Date(),
          notes,
        })
      },
    )
  }
  async createInventory(
    input: Omit<
      CreateInput<FeederInventoryItem>,
      'inventoryId' | 'qrValue' | 'quantity'
    >,
    quantity: number,
  ) {
    if (quantity < 0) throw new Error('Quantity cannot be negative.')
    return db.transaction(
      'rw',
      db.feederInventory,
      db.inventoryTransactions,
      async () => {
        const code = nextRecordCode(
          'INV',
          (await db.feederInventory.toArray()).map((item) => item.inventoryId),
        )
        const item = await feederInventoryRepository.create({
          ...input,
          quantity,
          inventoryId: code,
          qrValue: `orchard:inventory:${code}`,
        })
        if (quantity)
          await inventoryTransactionRepository.create({
            inventoryId: item.id,
            action: 'add',
            quantityDelta: quantity,
            balanceAfter: quantity,
            occurredAt: new Date(),
          })
        return item
      },
    )
  }
  logMaintenance(input: CreateInput<MaintenanceLog>) {
    if (!input.colonyId && !input.batchId)
      throw new Error('Choose a colony or cricket batch.')
    return maintenanceLogRepository.create(input)
  }
  async logFeeding(input: CreateInput<FeedingLog>) {
    if (input.quantityEaten > input.quantityOffered || input.quantityEaten < 0)
      throw new Error('Invalid feeding quantities.')
    return db.transaction(
      'rw',
      db.feedingLogs,
      db.feederInventory,
      db.inventoryTransactions,
      async () => {
        if (input.inventoryId && input.quantityEaten > 0)
          await this.adjustInventory(
            input.inventoryId,
            'feed-out',
            -input.quantityEaten,
            'Feeding log',
          )
        return feedingLogRepository.create(input)
      },
    )
  }
  async logHarvest(input: CreateInput<HarvestLog>) {
    if (input.quantity <= 0)
      throw new Error('Harvest quantity must be positive.')
    if (input.destination === 'inventory' && !input.inventoryId)
      throw new Error('Choose the inventory item receiving this harvest.')
    return db.transaction(
      'rw',
      db.harvestLogs,
      db.feederInventory,
      db.inventoryTransactions,
      async () => {
        const harvest = await harvestLogRepository.create(input)
        if (input.destination === 'inventory' && input.inventoryId)
          await this.adjustInventory(
            input.inventoryId,
            'harvest-in',
            input.quantity,
            `Harvest ${input.harvestId}`,
          )
        return harvest
      },
    )
  }
}
export const feederService = new FeederService()

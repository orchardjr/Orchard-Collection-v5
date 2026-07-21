import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export const feederSpeciesRepository = new BaseRepository(db.feederSpecies)
export const feederColonyRepository = new BaseRepository(db.feederColonies)
export const cricketBatchRepository = new BaseRepository(db.cricketBatches)
export const feederInventoryRepository = new BaseRepository(db.feederInventory)
export const inventoryTransactionRepository = new BaseRepository(
  db.inventoryTransactions,
)
export const maintenanceLogRepository = new BaseRepository(db.maintenanceLogs)
export const harvestLogRepository = new BaseRepository(db.harvestLogs)
export const feedingLogRepository = new BaseRepository(db.feedingLogs)
export const feederSettingsRepository = new BaseRepository(db.feederSettings)

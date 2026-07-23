import type {
  CricketBatch,
  FeederColony,
  FeederInventoryItem,
  FeederSettings,
  FeederSpecies,
  FeedingLog,
  HarvestLog,
  InventoryTransaction,
  MaintenanceLog,
} from '../models'
import { SupabaseRepository } from './SupabaseRepository'

export const cloudFeederSpeciesRepository =
  new SupabaseRepository<FeederSpecies>('feeder_species')
export const cloudFeederColonyRepository = new SupabaseRepository<FeederColony>(
  'feeder_colonies',
)
export const cloudCricketBatchRepository = new SupabaseRepository<CricketBatch>(
  'cricket_batches',
)
export const cloudFeederInventoryRepository =
  new SupabaseRepository<FeederInventoryItem>('feeder_inventory')
export const cloudInventoryTransactionRepository =
  new SupabaseRepository<InventoryTransaction>('inventory_transactions')
export const cloudMaintenanceLogRepository =
  new SupabaseRepository<MaintenanceLog>('maintenance_logs')
export const cloudHarvestLogRepository = new SupabaseRepository<HarvestLog>(
  'harvest_logs',
)
export const cloudFeedingLogRepository = new SupabaseRepository<FeedingLog>(
  'feeding_logs',
)
export const cloudFeederSettingsRepository =
  new SupabaseRepository<FeederSettings>('feeder_settings')

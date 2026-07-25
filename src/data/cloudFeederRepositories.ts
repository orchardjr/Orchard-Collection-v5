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
import type { CreateInput } from '../db/repositories/BaseRepository'
import { requireSupabase } from '../lib/supabase'
import { repositoryError, SupabaseRepository } from './SupabaseRepository'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class CloudFeederColonyRepository extends SupabaseRepository<FeederColony> {
  constructor() {
    super('feeder_colonies')
  }

  private async resolveSpeciesId(speciesId: string) {
    const client = requireSupabase()
    if (uuidPattern.test(speciesId)) {
      const direct = await client
        .from('feeder_species')
        .select('id')
        .eq('id', speciesId)
        .maybeSingle()
      if (direct.error) throw repositoryError('read', direct.error)
      if (direct.data) return direct.data.id
    }

    const imported = await client
      .from('feeder_species')
      .select('id')
      .eq('legacy_id', speciesId)
      .maybeSingle()
    if (imported.error) throw repositoryError('read', imported.error)
    if (imported.data) return imported.data.id

    throw new Error(
      'The selected feeder species is no longer available. Refresh the page and choose it again.',
    )
  }

  override async create(input: CreateInput<FeederColony>) {
    const speciesId = await this.resolveSpeciesId(input.speciesId)
    return super.create({ ...input, speciesId })
  }
}

export const cloudFeederSpeciesRepository =
  new SupabaseRepository<FeederSpecies>('feeder_species')
export const cloudFeederColonyRepository = new CloudFeederColonyRepository()
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

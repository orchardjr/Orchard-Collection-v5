import { isSupabaseConfigured } from '../../lib/supabase'
import {
  cloudPlantRepository,
  cloudSpaceRepository,
  cloudTaskRepository,
  cloudTimelineRepository,
} from '../../data/cloudRepositories'
import { cloudMediaRepository } from '../../data/CloudMediaRepository'
import {
  cloudCricketBatchRepository,
  cloudFeederColonyRepository,
  cloudFeederInventoryRepository,
  cloudFeederSettingsRepository,
  cloudFeederSpeciesRepository,
  cloudFeedingLogRepository,
  cloudHarvestLogRepository,
  cloudInventoryTransactionRepository,
  cloudMaintenanceLogRepository,
} from '../../data/cloudFeederRepositories'
import {
  cricketBatchRepository as localCricketBatchRepository,
  feederColonyRepository as localFeederColonyRepository,
  feederInventoryRepository as localFeederInventoryRepository,
  feederSettingsRepository as localFeederSettingsRepository,
  feederSpeciesRepository as localFeederSpeciesRepository,
  feedingLogRepository as localFeedingLogRepository,
  harvestLogRepository as localHarvestLogRepository,
  inventoryTransactionRepository as localInventoryTransactionRepository,
  maintenanceLogRepository as localMaintenanceLogRepository,
} from './FeederRepositories'
import { mediaRepository as localMediaRepository } from './MediaRepository'
import { plantRepository as localPlantRepository } from './PlantRepository'
import { spaceRepository as localSpaceRepository } from './SpaceRepository'
import { taskRepository as localTaskRepository } from './TaskRepository'
import { timelineRepository as localTimelineRepository } from './TimelineRepository'

export { MediaRepository } from './MediaRepository'
export { PlantRepository } from './PlantRepository'
export { SpaceRepository } from './SpaceRepository'
export { TaskRepository } from './TaskRepository'
export { TimelineRepository } from './TimelineRepository'
export const mediaRepository = isSupabaseConfigured
  ? cloudMediaRepository
  : localMediaRepository
export const plantRepository = isSupabaseConfigured
  ? cloudPlantRepository
  : localPlantRepository
export const spaceRepository = isSupabaseConfigured
  ? cloudSpaceRepository
  : localSpaceRepository
export const taskRepository = isSupabaseConfigured
  ? cloudTaskRepository
  : localTaskRepository
export const timelineRepository = isSupabaseConfigured
  ? cloudTimelineRepository
  : localTimelineRepository
export const feederSpeciesRepository = isSupabaseConfigured
  ? cloudFeederSpeciesRepository
  : localFeederSpeciesRepository
export const feederColonyRepository = isSupabaseConfigured
  ? cloudFeederColonyRepository
  : localFeederColonyRepository
export const cricketBatchRepository = isSupabaseConfigured
  ? cloudCricketBatchRepository
  : localCricketBatchRepository
export const feederInventoryRepository = isSupabaseConfigured
  ? cloudFeederInventoryRepository
  : localFeederInventoryRepository
export const inventoryTransactionRepository = isSupabaseConfigured
  ? cloudInventoryTransactionRepository
  : localInventoryTransactionRepository
export const maintenanceLogRepository = isSupabaseConfigured
  ? cloudMaintenanceLogRepository
  : localMaintenanceLogRepository
export const harvestLogRepository = isSupabaseConfigured
  ? cloudHarvestLogRepository
  : localHarvestLogRepository
export const feedingLogRepository = isSupabaseConfigured
  ? cloudFeedingLogRepository
  : localFeedingLogRepository
export const feederSettingsRepository = isSupabaseConfigured
  ? cloudFeederSettingsRepository
  : localFeederSettingsRepository
export type { CreateInput, UpdateInput } from './BaseRepository'

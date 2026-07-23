import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ensureFeederReferenceData } from '../db/seed'
import {
  cricketBatchRepository,
  feederColonyRepository,
  feederInventoryRepository,
  feederSettingsRepository,
  feederSpeciesRepository,
  feedingLogRepository,
  harvestLogRepository,
  inventoryTransactionRepository,
  maintenanceLogRepository,
  plantRepository,
} from '../db/repositories'
import { isSupabaseConfigured } from '../lib/supabase'

export const feederKeys = { all: ['feeders'] as const }
export function useFeederData() {
  return useQuery({
    queryKey: feederKeys.all,
    queryFn: async () => {
      if (!isSupabaseConfigured) await ensureFeederReferenceData()
      const [
        species,
        colonies,
        batches,
        inventory,
        transactions,
        maintenance,
        harvests,
        feedings,
        settings,
        animals,
      ] = await Promise.all([
        feederSpeciesRepository.getAll(),
        feederColonyRepository.getAll(),
        cricketBatchRepository.getAll(),
        feederInventoryRepository.getAll(),
        inventoryTransactionRepository.getAll(),
        maintenanceLogRepository.getAll(),
        harvestLogRepository.getAll(),
        feedingLogRepository.getAll(),
        feederSettingsRepository.getAll(),
        plantRepository
          .getAll()
          .then((plants) => plants.filter((plant) => plant.kind === 'animal')),
      ])
      return {
        species,
        colonies,
        batches,
        inventory,
        transactions,
        maintenance,
        harvests,
        feedings,
        settings,
        animals,
      }
    },
  })
}
export function useFeederMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: feederKeys.all }),
  })
}

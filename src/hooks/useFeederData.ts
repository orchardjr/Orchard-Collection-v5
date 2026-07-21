import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../db/database'
import { ensureFeederReferenceData } from '../db/seed'

export const feederKeys = { all: ['feeders'] as const }
export function useFeederData() {
  return useQuery({
    queryKey: feederKeys.all,
    queryFn: async () => {
      await ensureFeederReferenceData()
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
        db.feederSpecies.toArray(),
        db.feederColonies.toArray(),
        db.cricketBatches.toArray(),
        db.feederInventory.toArray(),
        db.inventoryTransactions.toArray(),
        db.maintenanceLogs.toArray(),
        db.harvestLogs.toArray(),
        db.feedingLogs.toArray(),
        db.feederSettings.toArray(),
        db.plants.filter((plant) => plant.kind === 'animal').toArray(),
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

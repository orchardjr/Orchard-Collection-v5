import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'
import { repositoryError } from '../../data/SupabaseRepository'

export interface PlantAssignmentTag {
  plantId: string
  name: string
}

export function usePlantAssignmentTags() {
  return useQuery({
    queryKey: ['plant-assignment-tags'],
    queryFn: async (): Promise<PlantAssignmentTag[]> => {
      if (!isSupabaseConfigured) return []
      const { data, error } = await requireSupabase()
        .from('plant_tag_links')
        .select('plant_id, tags(name)')
      if (error) throw repositoryError('plant tags read', error)
      return (data ?? []).flatMap((row) => {
        const tags = Array.isArray(row.tags) ? row.tags : [row.tags]
        return tags.filter(Boolean).map((tag) => ({
          plantId: row.plant_id as string,
          name: tag.name as string,
        }))
      })
    },
    throwOnError: true,
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured } from '../../lib/supabase'
import { readReptiles } from './reptileService'
export function useReptiles() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['reptiles'],
    queryFn: readReptiles,
    enabled: isSupabaseConfigured,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  })
  const action = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSettled: () =>
      Promise.all(
        ['reptiles', 'tasks', 'dashboard'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  })
  return { ...query, action, configured: isSupabaseConfigured }
}

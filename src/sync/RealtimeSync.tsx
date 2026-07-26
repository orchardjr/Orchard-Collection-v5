import { useQueryClient } from '@tanstack/react-query'
import { useEffect, type PropsWithChildren } from 'react'

import { useAuth } from '../auth/authContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const syncedTables = [
  'plants',
  'spaces',
  'tasks',
  'timeline_events',
  'plant_media',
  'feeder_species',
  'feeder_colonies',
  'cricket_batches',
  'feeder_inventory',
  'inventory_transactions',
  'maintenance_logs',
  'harvest_logs',
  'feeding_logs',
  'feeder_settings',
  'nfc_tags',
  'label_templates',
] as const

export function RealtimeSync({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return
    const client = supabase

    let channel = client.channel(`orchard:${user.id}`)
    for (const table of syncedTables) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${user.id}`,
        },
        () => void queryClient.invalidateQueries(),
      )
    }
    channel.subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [queryClient, user])

  return children
}

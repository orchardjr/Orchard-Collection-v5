import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured } from '../../lib/supabase'
import { isLocalCollectionMode } from '../../data/localCollectionMode'
import { timelineRepository as localTimeline } from '../../db/repositories/TimelineRepository'
import { cloudTimelineRepository } from '../../data/cloudRepositories'
import { readPrintRows } from '../plants/useCollectionPrintData'
import type { TimelineEvent } from '../../models'
import { healthObservation, type HealthStatus } from './plantHealth'

export function usePlantHealth(enabled = true) {
  const local = !isSupabaseConfigured || isLocalCollectionMode()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['timeline', 'plant-health', local],
    enabled,
    queryFn: () =>
      local
        ? localTimeline.getAll()
        : readPrintRows<TimelineEvent>('timeline_events'),
  })
  const save = useMutation({
    mutationFn: (input: {
      plantId: string
      status: HealthStatus
      notes: string
      mediaId?: string
    }) =>
      (local ? localTimeline : cloudTimelineRepository).create(
        healthObservation(
          input.plantId,
          input.status,
          input.notes,
          input.mediaId,
        ),
      ),
    onSuccess: () =>
      Promise.all(
        ['timeline', 'dashboard'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  })
  return { ...query, save }
}

import { useQuery } from '@tanstack/react-query'

import { ensureSeedData } from '../db/seed'
import {
  mediaRepository,
  plantRepository,
  spaceRepository,
  taskRepository,
  timelineRepository,
} from '../db/repositories'

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      await ensureSeedData()
      return plantRepository.getAll()
    },
  })
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      await ensureSeedData()
      const [plants, tasks, timeline, spaces, media] = await Promise.all([
        plantRepository.getAll(),
        taskRepository.getAll(),
        timelineRepository.getAll(),
        spaceRepository.getAll(),
        mediaRepository.getAll(),
      ])

      return {
        plants,
        tasks: tasks.sort(
          (first, second) =>
            (first.dueAt?.getTime() ?? 0) - (second.dueAt?.getTime() ?? 0),
        ),
        timeline: timeline.sort(
          (first, second) =>
            second.occurredAt.getTime() - first.occurredAt.getTime(),
        ),
        spaces,
        media,
      }
    },
  })
}

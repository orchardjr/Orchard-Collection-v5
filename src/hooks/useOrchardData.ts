import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ensureSeedData } from '../db/seed'
import { plantRepository as localPlantRepository } from '../db/repositories/PlantRepository'
import { spaceRepository as localSpaceRepository } from '../db/repositories/SpaceRepository'
import { taskRepository as localTaskRepository } from '../db/repositories/TaskRepository'
import { timelineRepository as localTimelineRepository } from '../db/repositories/TimelineRepository'
import { mediaRepository as localMediaRepository } from '../db/repositories/MediaRepository'
import { localNfcTagRepository } from '../db/repositories/NfcTagRepository'
import {
  mediaRepository,
  plantRepository,
  spaceRepository,
  taskRepository,
  timelineRepository,
  nfcTagRepository,
} from '../db/repositories'
import type { CreateInput, UpdateInput } from '../db/repositories'
import type { MediaAsset, Plant, Space, Task, TimelineEvent } from '../models'
import { mediaService } from '../services/MediaService'
import { plantService } from '../services/PlantService'
import { spaceService } from '../services/SpaceService'
import { taskService } from '../services/TaskService'
import { timelineService } from '../services/TimelineService'
import { nfcTagService } from '../services/NfcTagService'
import { isSupabaseConfigured } from '../lib/supabase'
import { isUuid } from '../lib/isUuid'
import { readWithLocalFallback } from '../data/readWithLocalFallback'
import { safeCloudError } from '../data/collectionReadDiagnostics'
import { normalizeNfcTagQueryResult } from '../features/nfc/nfcQueryResult'
import { activePlants } from '../features/plants/plantFilters'

async function prepareData() {
  if (!isSupabaseConfigured) await ensureSeedData()
}

const readPlants = () =>
  readWithLocalFallback(
    () => plantRepository.getAll(),
    () => localPlantRepository.getAll(),
    isSupabaseConfigured,
    { repository: 'plants', operation: 'getAll', query: 'select *' },
  )
const readSpaces = () =>
  readWithLocalFallback(
    () => spaceRepository.getAll(),
    () => localSpaceRepository.getAll(),
    isSupabaseConfigured,
    { repository: 'spaces', operation: 'getAll', query: 'select *' },
  )
const readTasks = () =>
  readWithLocalFallback(
    () => taskRepository.getAll(),
    () => localTaskRepository.getAll(),
    isSupabaseConfigured,
    { repository: 'tasks', operation: 'getAll', query: 'select *' },
  )
const readTimeline = () =>
  readWithLocalFallback(
    () => timelineRepository.getAll(),
    () => localTimelineRepository.getAll(),
    isSupabaseConfigured,
    {
      repository: 'timeline_events',
      operation: 'getAll',
      query: 'select *',
    },
  )
const readMedia = () =>
  readWithLocalFallback(
    () => mediaRepository.getAll(),
    () => localMediaRepository.getAll(),
    isSupabaseConfigured,
    {
      repository: 'plant_media',
      operation: 'getAll',
      query: 'select * order by uploaded_at desc',
    },
  )

export function useSpaces() {
  return useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      await prepareData()
      return readSpaces()
    },
    throwOnError: true,
  })
}
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      await prepareData()
      return readTasks()
    },
    throwOnError: true,
  })
}
export function useTimeline() {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      await prepareData()
      const timeline = await readTimeline()
      return timeline.sort(
        (first, second) =>
          second.occurredAt.getTime() - first.occurredAt.getTime(),
      )
    },
    throwOnError: true,
  })
}

function useRefresh(keys: string[]) {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all(
      keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
  }
}

export function useSpaceMutations() {
  const refresh = useRefresh(['spaces', 'plants', 'dashboard'])
  return {
    createSpace: useMutation({
      mutationFn: (input: CreateInput<Space>) => spaceService.create(input),
      onSuccess: refresh,
    }),
    updateSpace: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateInput<Space> }) =>
        spaceService.update(id, input),
      onSuccess: refresh,
    }),
    archiveSpace: useMutation({
      mutationFn: (id: string) => spaceService.archive(id),
      onSuccess: refresh,
    }),
    restoreSpace: useMutation({
      mutationFn: (id: string) => spaceService.restore(id),
      onSuccess: refresh,
    }),
  }
}

export function useTaskMutations() {
  const refresh = useRefresh(['tasks', 'timeline', 'dashboard'])
  return {
    createTask: useMutation({
      mutationFn: (input: CreateInput<Task>) => taskService.create(input),
      onSuccess: refresh,
    }),
    updateTask: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateInput<Task> }) =>
        taskService.update(id, input),
      onSuccess: refresh,
    }),
    completeTask: useMutation({
      mutationFn: (id: string) => taskService.complete(id),
      onSuccess: refresh,
    }),
    reopenTask: useMutation({
      mutationFn: (id: string) => taskService.reopen(id),
      onSuccess: refresh,
    }),
    skipTask: useMutation({
      mutationFn: (id: string) => taskService.skip(id),
      onSuccess: refresh,
    }),
    archiveTask: useMutation({
      mutationFn: (id: string) => taskService.archive(id),
      onSuccess: refresh,
    }),
  }
}

export function useTimelineMutations() {
  const refresh = useRefresh(['timeline', 'dashboard'])
  return {
    createObservation: useMutation({
      mutationFn: (input: Omit<CreateInput<TimelineEvent>, 'isManual'>) =>
        timelineService.createObservation(input),
      onSuccess: refresh,
    }),
    updateObservation: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string
        input: UpdateInput<TimelineEvent>
      }) => timelineService.updateObservation(id, input),
      onSuccess: refresh,
    }),
    deleteObservation: useMutation({
      mutationFn: (id: string) => timelineService.deleteObservation(id),
      onSuccess: refresh,
    }),
  }
}

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      await prepareData()
      return readPlants()
    },
    throwOnError: true,
  })
}

export function usePlant(id: string | undefined) {
  return useQuery({
    queryKey: ['plants', id],
    queryFn: async () => {
      await prepareData()
      return id
        ? readWithLocalFallback(
            () => plantRepository.getById(id),
            () => localPlantRepository.getById(id),
            isSupabaseConfigured,
            {
              repository: 'plants',
              operation: 'getById',
              query: 'select * where id = :id',
            },
          )
        : undefined
    },
    enabled: Boolean(id),
    throwOnError: true,
  })
}

export function usePlantNfcTag(plantId: string | undefined) {
  return useQuery({
    queryKey: ['nfc-tags', 'plant', plantId],
    queryFn: async () => {
      if (!plantId) return undefined
      const source = isUuid(plantId) ? 'cloud-with-local-fallback' : 'local'
      try {
        const tag =
          source === 'local'
            ? await localNfcTagRepository.findAssigned('plant', plantId)
            : await readWithLocalFallback(
                () => nfcTagRepository.findAssigned('plant', plantId),
                () => localNfcTagRepository.findAssigned('plant', plantId),
                isSupabaseConfigured,
                {
                  repository: 'nfc_tags',
                  operation: 'findAssigned',
                  query:
                    'select * where resource_type = plant and resource_id = :id',
                },
              )
        return normalizeNfcTagQueryResult(tag)
      } catch (error) {
        console.error('orchard.nfc-read', {
          repository: 'nfc_tags',
          operation: 'findAssigned',
          source,
          resourceIdType: isUuid(plantId) ? 'uuid' : 'local',
          error: safeCloudError(error),
        })
        throw error
      }
    },
    enabled: Boolean(plantId),
    // NFC is an optional enhancement. A missing or not-yet-deployed NFC
    // schema must not prevent the core plant record from opening.
    throwOnError: false,
  })
}

export function useNfcTagMutations() {
  const queryClient = useQueryClient()
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['nfc-tags'] })

  return {
    assignTag: useMutation({
      mutationFn: nfcTagService.assignTag.bind(nfcTagService),
      onSuccess: refresh,
    }),
    unassignTag: useMutation({
      mutationFn: nfcTagService.unassignTag.bind(nfcTagService),
      onSuccess: refresh,
    }),
    replaceTag: useMutation({
      mutationFn: ({
        id,
        nickname,
        notes,
        uid,
      }: {
        id: string
        nickname?: string
        notes?: string
        uid?: string
      }) => nfcTagService.replaceTag(id, { nickname, notes, uid }),
      onSuccess: refresh,
    }),
  }
}

export function usePlantTimeline(plantId: string | undefined) {
  return useQuery({
    queryKey: ['timeline', plantId],
    queryFn: async () => {
      await prepareData()
      return plantId
        ? readWithLocalFallback(
            () => timelineRepository.getByPlantId(plantId),
            () => localTimelineRepository.getByPlantId(plantId),
            isSupabaseConfigured,
            {
              repository: 'timeline_events',
              operation: 'getByPlantId',
              query: 'select * where plant_id = :plantId',
            },
          )
        : []
    },
    enabled: Boolean(plantId),
    throwOnError: true,
  })
}

export function usePlantMedia(plantId: string | undefined) {
  return useQuery({
    queryKey: ['media', plantId],
    queryFn: async () => {
      await prepareData()
      return plantId
        ? readWithLocalFallback(
            () => mediaRepository.getByPlantId(plantId),
            () => localMediaRepository.getByPlantId(plantId),
            isSupabaseConfigured,
            {
              repository: 'plant_media',
              operation: 'getByPlantId',
              query: 'select * where plant_id = :plantId',
            },
          )
        : []
    },
    enabled: Boolean(plantId),
    throwOnError: true,
  })
}

export function useAllMedia() {
  return useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      await prepareData()
      return readMedia()
    },
    throwOnError: true,
  })
}

export function useMediaMutations() {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['media'] }),
      queryClient.invalidateQueries({ queryKey: ['plants'] }),
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }
  const importMedia = useMutation({
    mutationFn: ({
      plantId,
      files,
      onProgress,
    }: {
      plantId: string
      files: File[]
      onProgress?: (done: number, total: number) => void
    }) =>
      mediaService.importFiles(plantId, files, (progress) =>
        onProgress?.(progress.completed, progress.total),
      ),
    onSuccess: refresh,
  })
  const setHero = useMutation({
    mutationFn: (asset: MediaAsset) => mediaService.setHero(asset),
    onSuccess: refresh,
  })
  const toggleFavorite = useMutation({
    mutationFn: (asset: MediaAsset) => mediaService.toggleFavorite(asset),
    onSuccess: refresh,
  })
  const deleteMedia = useMutation({
    mutationFn: (asset: MediaAsset) => mediaService.delete(asset),
    onSuccess: refresh,
  })
  const updateNotes = useMutation({
    mutationFn: ({ asset, notes }: { asset: MediaAsset; notes: string }) =>
      mediaService.updateNotes(asset, notes),
    onSuccess: refresh,
  })
  const updateTags = useMutation({
    mutationFn: ({ asset, tags }: { asset: MediaAsset; tags: string[] }) =>
      mediaService.updateTags(asset, tags),
    onSuccess: refresh,
  })
  return {
    deleteMedia,
    importMedia,
    setHero,
    toggleFavorite,
    updateNotes,
    updateTags,
  }
}

export function usePlantMutations() {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['plants'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['media'] }),
      queryClient.invalidateQueries({ queryKey: ['nfc-tags'] }),
      queryClient.invalidateQueries({ queryKey: ['label-preview'] }),
    ])
  }

  const createPlant = useMutation({
    mutationFn: (input: CreateInput<Plant>) => plantService.create(input),
    onSuccess: refresh,
  })
  const updatePlant = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInput<Plant> }) =>
      plantService.update(id, input),
    onSuccess: refresh,
  })
  const archivePlant = useMutation({
    mutationFn: (id: string) => plantService.archive(id),
    onSettled: refresh,
  })
  const restorePlant = useMutation({
    mutationFn: (id: string) => plantService.restore(id),
    onSettled: refresh,
  })
  const deletePlant = useMutation({
    mutationFn: (id: string) => plantService.deletePermanently(id),
    onSettled: refresh,
  })

  const resetErrors = () => {
    createPlant.reset()
    updatePlant.reset()
    archivePlant.reset()
    restorePlant.reset()
    deletePlant.reset()
  }

  return {
    archivePlant,
    createPlant,
    deletePlant,
    resetErrors,
    restorePlant,
    updatePlant,
  }
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      await prepareData()
      const [plants, tasks, timeline, spaces, media] = await Promise.all([
        readPlants(),
        readTasks(),
        readTimeline(),
        readSpaces(),
        readMedia(),
      ])

      return {
        plants: activePlants(plants),
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

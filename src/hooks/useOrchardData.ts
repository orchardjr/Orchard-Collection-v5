import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ensureSeedData } from '../db/seed'
import {
  mediaRepository,
  plantRepository,
  spaceRepository,
  taskRepository,
  timelineRepository,
} from '../db/repositories'
import type { CreateInput, UpdateInput } from '../db/repositories'
import type { MediaAsset, Plant } from '../models'
import { mediaService } from '../services/MediaService'
import { plantService } from '../services/PlantService'

export function usePlants() {
  return useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      await ensureSeedData()
      return plantRepository.getAll()
    },
    throwOnError: true,
  })
}

export function usePlant(id: string | undefined) {
  return useQuery({
    queryKey: ['plants', id],
    queryFn: async () => {
      await ensureSeedData()
      return id ? plantRepository.getById(id) : undefined
    },
    enabled: Boolean(id),
    throwOnError: true,
  })
}

export function usePlantTimeline(plantId: string | undefined) {
  return useQuery({
    queryKey: ['timeline', plantId],
    queryFn: async () => {
      await ensureSeedData()
      return plantId ? timelineRepository.getByPlantId(plantId) : []
    },
    enabled: Boolean(plantId),
    throwOnError: true,
  })
}

export function usePlantMedia(plantId: string | undefined) {
  return useQuery({
    queryKey: ['media', plantId],
    queryFn: async () => {
      await ensureSeedData()
      return plantId ? mediaRepository.getByPlantId(plantId) : []
    },
    enabled: Boolean(plantId),
    throwOnError: true,
  })
}

export function useAllMedia() {
  return useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      await ensureSeedData()
      return mediaRepository.getAll()
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
    onSuccess: refresh,
  })

  const resetErrors = () => {
    createPlant.reset()
    updatePlant.reset()
    archivePlant.reset()
  }

  return { archivePlant, createPlant, resetErrors, updatePlant }
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

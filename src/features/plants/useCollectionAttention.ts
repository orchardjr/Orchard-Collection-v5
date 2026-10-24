import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { taskRepository } from '../../db/repositories/TaskRepository'
import type { Task } from '../../models'
import { collectionAttention } from './collectionAttention'
import { readPrintRows, useCollectionPrintData } from './useCollectionPrintData'
import { ensureSeedData } from '../../db/seed'
import { isSupabaseConfigured } from '../../lib/supabase'

export async function readAttentionTasks() {
  const [tasks, links] = await Promise.all([
    readPrintRows<Task>('tasks'),
    readPrintRows<{ taskId: string; plantId: string }>('task_plants'),
  ])
  const assignments = new Map<string, string[]>()
  for (const link of links) {
    if (!assignments.has(link.taskId)) assignments.set(link.taskId, [])
    assignments.get(link.taskId)!.push(link.plantId)
  }
  return tasks.map((task) => ({
    ...task,
    plantIds: [
      ...new Set([
        ...(assignments.get(task.id) ?? []),
        ...(task.plantId ? [task.plantId] : []),
      ]),
    ],
  }))
}

export function useCollectionAttention(enabled = true) {
  const data = useCollectionPrintData({ enabled, thumbnails: false })
  const tasks = useQuery({
    queryKey: ['tasks', 'collection-attention', data.local],
    enabled,
    queryFn: async () => {
      if (!data.local) return readAttentionTasks()
      if (!isSupabaseConfigured) await ensureSeedData()
      return taskRepository.getAll()
    },
  })
  const [, setNow] = useState(() => new Date())
  // Read the current day on every render, including when a previously disabled
  // Collection filter is enabled after midnight. The timer only triggers renders.
  const today = new Date().setHours(0, 0, 0, 0)
  useEffect(() => {
    if (!enabled) return
    const refresh = () => setNow(new Date())
    // Re-evaluate date boundaries even when the dashboard stays open overnight.
    const timer = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled])
  const attention = useMemo(
    () =>
      collectionAttention(
        data.plants,
        data.media,
        data.tags,
        tasks.data ?? [],
        new Date(today),
      ),
    [data.plants, data.media, data.tags, tasks.data, today],
  )
  return {
    ...data,
    attention,
    loading: enabled && (data.loading || tasks.isPending),
    error: data.error || tasks.error,
    retry: () => Promise.all([data.retry(), tasks.refetch()]),
  }
}

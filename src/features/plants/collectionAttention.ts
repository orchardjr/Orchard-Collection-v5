import type { MediaAsset, NfcTag, Plant, Task } from '../../models'
import { assignedPlantIds, careNextDue } from '../tasks/taskScheduling'
import {
  collectionAuditByPlant,
  matchesCollectionAudit,
} from './collectionPrint'

export const attentionFilters = [
  { id: 'overdueWater', label: 'Overdue watering' },
  { id: 'overdueFertilizer', label: 'Overdue fertilizing' },
  { id: 'noPhotos', label: 'No photos' },
  { id: 'noNfc', label: 'No NFC assigned' },
  { id: 'noLocation', label: 'No location' },
  { id: 'noCare', label: 'No care schedule' },
] as const
export type AttentionFilter = (typeof attentionFilters)[number]['id']
export function parseAttentionFilter(
  value: string | null,
): AttentionFilter | undefined {
  return attentionFilters.find((filter) => filter.id === value)?.id
}

export function collectionAttention(
  plants: Plant[],
  media: MediaAsset[],
  tags: NfcTag[],
  tasks: Task[],
  now = new Date(),
) {
  const result = Object.fromEntries(
    attentionFilters.map(({ id }) => [id, new Set<string>()]),
  ) as Record<AttentionFilter, Set<string>>
  const audit = collectionAuditByPlant(tags, media)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const careTasks = new Map<string, Task[]>()
  for (const task of tasks) {
    if (
      task.status !== 'open' ||
      (task.type !== 'water' && task.type !== 'fertilize')
    )
      continue
    for (const id of assignedPlantIds(task)) {
      if (!careTasks.has(id)) careTasks.set(id, [])
      careTasks.get(id)!.push(task)
    }
  }
  for (const plant of plants) {
    if (plant.status !== 'active') continue
    if (matchesCollectionAudit(audit.get(plant.id), 'noPhotos'))
      result.noPhotos.add(plant.id)
    if (matchesCollectionAudit(audit.get(plant.id), 'noNfc'))
      result.noNfc.add(plant.id)
    if (!plant.spaceId) result.noLocation.add(plant.id)
    const assigned = careTasks.get(plant.id) ?? []
    if (
      !(plant.waterIntervalDays && plant.waterIntervalDays > 0) &&
      !(plant.fertilizerIntervalDays && plant.fertilizerIntervalDays > 0) &&
      !assigned.some((task) => task.recurrence && task.recurrence !== 'none')
    )
      result.noCare.add(plant.id)
    for (const [type, key, last, days] of [
      ['water', 'overdueWater', plant.lastWateredAt, plant.waterIntervalDays],
      [
        'fertilize',
        'overdueFertilizer',
        plant.lastFertilizedAt,
        plant.fertilizerIntervalDays,
      ],
    ] as const) {
      const routines = assigned.filter((task) => task.type === type)
      // Managed task due dates are authoritative; other overdue care tasks
      // also require action. Never invent a due date without care history.
      const profileDue = routines.some((task) => task.careManaged)
        ? undefined
        : careNextDue(last, days)
      if (
        (profileDue && profileDue < today) ||
        routines.some((task) => task.dueAt && task.dueAt < today)
      )
        result[key].add(plant.id)
    }
  }
  return result
}

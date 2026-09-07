import type { Plant, Task, TaskType } from '../../models'

export function inputDate(date?: Date) {
  return date
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
    : ''
}

export const taskTypes: Record<TaskType, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  repot: 'Repot',
  treat: 'Treat / Pest control',
  prune: 'Prune',
  propagate: 'Propagate',
  photograph: 'Photograph',
  inspect: 'Inspect',
  rotate: 'Rotate',
  'moss-pole': 'Moss pole',
  custom: 'Other',
}

export function assignedPlantIds(task: Pick<Task, 'plantId' | 'plantIds'>) {
  return [...new Set(task.plantIds ?? (task.plantId ? [task.plantId] : []))]
}

export function careNextDue(last: Date | undefined, days?: number) {
  if (!last || !days || days < 1) return undefined
  const date = new Date(last)
  date.setDate(date.getDate() + days)
  return date
}

export function nextDueDate(task: Task, completedAt?: Date): Date | undefined {
  if (!task.recurrence || task.recurrence === 'none') return undefined
  const base = completedAt ?? task.dueAt
  if (!base) return undefined
  const next = new Date(base)
  if (task.recurrence === 'monthly') {
    const day = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(day, last))
  } else {
    next.setDate(
      next.getDate() +
        (task.recurrence === 'daily'
          ? 1
          : task.recurrence === 'weekly'
            ? 7
            : Math.max(1, task.recurrenceIntervalDays ?? 1)),
    )
  }
  return next
}

export function recurrenceLabel(task: Task) {
  if (task.recurrence === 'interval')
    return `Every ${task.recurrenceIntervalDays ?? 1} days`
  return {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    none: 'Does not repeat',
  }[task.recurrence ?? 'none']
}

export function plantTaskGroups(
  tasks: Task[],
  now = new Date(),
): Array<[string, Task[]]> {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const open = tasks
    .filter((t) => t.status === 'open')
    .sort(
      (a, b) =>
        (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity),
    )
  return [
    ['Due / Overdue', open.filter((t) => t.dueAt && t.dueAt <= end)],
    [
      'Upcoming',
      open.filter(
        (t) =>
          (!t.dueAt || t.dueAt > end) &&
          (!t.recurrence || t.recurrence === 'none'),
      ),
    ],
    [
      'Recurring',
      open.filter(
        (t) =>
          (!t.dueAt || t.dueAt > end) &&
          t.recurrence &&
          t.recurrence !== 'none',
      ),
    ],
    [
      'Completed',
      tasks
        .filter((t) => t.status === 'completed')
        .sort(
          (a, b) =>
            (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
        ),
    ],
  ]
}

export type CareProfileInput = Pick<
  Plant,
  | 'waterIntervalDays'
  | 'fertilizerIntervalDays'
  | 'lastWateredAt'
  | 'lastFertilizedAt'
  | 'mounted'
  | 'mossPole'
  | 'careNotes'
> & {
  waterTask: boolean
  fertilizerTask: boolean
}

export function validateCare(input: CareProfileInput) {
  for (const value of [input.waterIntervalDays, input.fertilizerIntervalDays]) {
    if (
      value !== undefined &&
      (!Number.isInteger(value) || value < 0 || value > 3650)
    )
      throw new Error(
        'Care intervals must be whole numbers from 1 to 3650 days, or disabled.',
      )
  }
  for (const date of [input.lastWateredAt, input.lastFertilizedAt]) {
    if (date && (!Number.isFinite(date.getTime()) || date > new Date()))
      throw new Error(
        'Last completed dates must be valid dates that are not in the future.',
      )
  }
}

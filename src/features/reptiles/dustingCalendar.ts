import type { ReptileData, Routine } from './types'

export interface DustingEntry {
  day: string
  animal: string
  reptileId: string
  product: string
  d3: string
  state: string
  overlap: boolean
}
export function calendarDay(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return ['year', 'month', 'day']
    .map((key) => parts.find((p) => p.type === key)!.value)
    .join('-')
}
const addDays = (day: string, count: number) => {
  const date = new Date(day + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}
export function nextDustingDay(
  routine: Routine,
  day: string,
): string | undefined {
  if (routine.frequency === 'days' || routine.frequency === 'weeks')
    return addDays(
      day,
      routine.intervalCount * (routine.frequency === 'weeks' ? 7 : 1),
    )
  if (routine.frequency === 'weekdays') {
    for (let i = 1; i <= 7; i++) {
      const next = addDays(day, i)
      if (routine.weekdays.includes(new Date(next + 'T12:00:00Z').getUTCDay()))
        return next
    }
  }
  if (routine.frequency === 'monthly') {
    const date = new Date(day + 'T12:00:00Z')
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0),
    ).getUTCDate()
    date.setUTCMonth(date.getUTCMonth() + 1, Math.min(date.getUTCDate(), last))
    return date.toISOString().slice(0, 10)
  }
  if (routine.frequency === 'custom')
    return [...routine.customDates].sort().find((d) => d > day)
}
export function buildDustingCalendar(
  data: ReptileData,
  ids: string[],
  month: string,
) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    +month.slice(0, 4) < 1900 ||
    +month.slice(0, 4) > 2200
  )
    throw new Error('Choose a month between 1900 and 2200.')
  const entries: DustingEntry[] = []
  const reminders: string[] = []
  const zones = new Set<string>()
  const animals = data.reptiles.filter(
    (a) => ids.includes(a.id) && a.status === 'active' && !a.deleting,
  )
  for (const r of data.routines.filter(
    (r) => r.type === 'supplement' && animals.some((a) => a.id === r.reptileId),
  )) {
    const animal = animals.find((a) => a.id === r.reptileId)!
    const product = data.supplements.find((p) => p.id === r.supplementId)
    const label = product
      ? `${product.name}${product.brand ? ` (${product.brand})` : ''}`
      : 'Unknown supplement'
    zones.add(r.timezone)
    const add = (day: string, state: string) => {
      if (day.startsWith(month))
        entries.push({
          day,
          animal: animal.name,
          reptileId: animal.id,
          product: label,
          d3: product?.d3 ?? 'unknown',
          state,
          overlap: false,
        })
    }
    const saved = data.tasks
      .filter(
        (t) =>
          t.reptileRoutineId === r.id && t.dueAt && t.status !== 'archived',
      )
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
    for (const task of saved)
      add(
        calendarDay(task.dueAt!, r.timezone),
        task.status === 'completed'
          ? 'Completed'
          : task.status === 'skipped'
            ? 'Missed'
            : 'Scheduled',
      )
    if (!r.enabled) continue
    if (r.frequency === 'feeding') {
      reminders.push(
        `${animal.name}: ${label} - every feeding (D3: ${product?.d3 ?? 'unknown'}). Dates depend on actual feedings; not assumed given.`,
      )
      continue
    }
    const last = saved.at(-1)
    let cursor: string | undefined
    if (last) {
      const anchor = new Date(
        Math.max(last.dueAt!.getTime(), last.completedAt?.getTime() ?? 0),
      )
      cursor = nextDustingDay(r, calendarDay(anchor, r.timezone))
    } else {
      cursor = calendarDay(new Date(r.startsAt), r.timezone)
      if (
        r.frequency === 'weekdays' &&
        !r.weekdays.includes(new Date(cursor + 'T12:00:00Z').getUTCDay())
      )
        cursor = nextDustingDay(r, cursor)
      if (r.frequency === 'custom')
        cursor = [...r.customDates].sort().find((d) => d >= cursor!)
    }
    let iterations = 0
    while (cursor && cursor.slice(0, 7) <= month) {
      if (++iterations > 150000)
        throw new Error(
          'Schedule is too old to project. Update its start date.',
        )
      add(cursor, 'Planned')
      const next = nextDustingDay(r, cursor)
      if (next && next <= cursor)
        throw new Error('Schedule interval must advance the date.')
      cursor = next
    }
  }
  for (const entry of entries)
    entry.overlap =
      entry.d3 === 'yes' &&
      entries.some(
        (other) =>
          other !== entry &&
          other.reptileId === entry.reptileId &&
          other.day === entry.day &&
          other.d3 === 'yes',
      )
  entries.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      a.animal.localeCompare(b.animal) ||
      a.product.localeCompare(b.product),
  )
  return {
    month,
    entries,
    reminders,
    zones: [...zones],
    animalCount: animals.length,
  }
}
export type DustingCalendar = ReturnType<typeof buildDustingCalendar>

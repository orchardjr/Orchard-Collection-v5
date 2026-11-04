import type { ReptileEvent, FeederEntry } from './types'
export function weightHistory(events: ReptileEvent[]) {
  const sorted = events
    .filter((e) => e.kind === 'weight')
    .sort(
      (a, b) =>
        a.occurredAt.getTime() - b.occurredAt.getTime() ||
        a.id.localeCompare(b.id),
    )
  return sorted.map((event, index) => {
    const grams = Number(event.payload.grams)
    const previous = index
      ? Number(sorted[index - 1]!.payload.grams)
      : undefined
    return {
      event,
      grams,
      previous,
      change: previous === undefined ? undefined : grams - previous,
      percent: previous ? ((grams - previous) / previous) * 100 : undefined,
    }
  })
}
export function rangeStart(range: string, now = new Date()) {
  const start = new Date(now)
  if (range === 'all') return new Date(0)
  if (range === '30' || range === '90')
    start.setDate(start.getDate() - Number(range))
  else start.setMonth(start.getMonth() - (range === '6m' ? 6 : 12))
  return start
}
export function feedingTotals(events: ReptileEvent[]) {
  return events
    .filter((e) => e.kind === 'feeding')
    .reduce(
      (sum, event) => {
        for (const item of (event.payload.feeders as FeederEntry[]) ?? []) {
          sum.offered += item.offered
          sum.consumed += item.consumed
        }
        return sum
      },
      { offered: 0, consumed: 0 },
    )
}
export function ageLabel(
  identification: Record<string, string>,
  now = new Date(),
) {
  if (!identification.birthDate)
    return identification.estimatedAge || 'Age unknown'
  const birth = new Date(identification.birthDate + 'T00:00:00')
  if (!Number.isFinite(birth.getTime()) || birth > now) return 'Age unknown'
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    now.getMonth() -
    birth.getMonth() -
    (now.getDate() < birth.getDate() ? 1 : 0)
  return months < 1
    ? 'Under 1 month'
    : `${Math.floor(months / 12)} years, ${months % 12} months`
}
export function validateEvent(
  kind: string,
  payload: Record<string, unknown>,
  occurredAt: Date,
) {
  if (!Number.isFinite(occurredAt.getTime()) || occurredAt > new Date())
    throw new Error('Choose a valid actual date/time, not a future date.')
  if (
    kind === 'weight' &&
    (!Number.isFinite(Number(payload.grams)) || Number(payload.grams) <= 0)
  )
    throw new Error('Weight must be greater than zero grams.')
  if (kind === 'feeding') {
    const feeders = payload.feeders as FeederEntry[]
    if (
      !feeders?.length ||
      feeders.some(
        (f) =>
          !f.type.trim() ||
          !Number.isFinite(f.offered) ||
          !Number.isFinite(f.consumed) ||
          f.offered < 0 ||
          f.consumed < 0 ||
          f.consumed > f.offered,
      )
    )
      throw new Error(
        'Enter valid feeder quantities; consumed cannot exceed offered.',
      )
  }
  for (const key of ['dayHumidity', 'nightHumidity'])
    if (
      payload[key] !== undefined &&
      payload[key] !== '' &&
      (!Number.isFinite(Number(payload[key])) ||
        Number(payload[key]) < 0 ||
        Number(payload[key]) > 100)
    )
      throw new Error('Humidity must be between 0 and 100%.')
}
export function csvCell(value: unknown) {
  let text = String(value ?? '')
  if (/^\s*[=+@-]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
export function eventCsv(
  events: ReptileEvent[],
  kind: 'weight' | 'feeding',
  names: Map<string, string>,
) {
  const rows: unknown[][] = [
    kind === 'weight'
      ? ['Reptile', 'Date/time', 'Weight (g)', 'Notes']
      : [
          'Reptile',
          'Date/time',
          'Feeder',
          'Offered',
          'Consumed',
          'Size',
          'Gut loaded',
          'Supplements noted',
          'Appetite',
          'Notes',
        ],
  ]
  for (const e of events.filter((e) => e.kind === kind)) {
    if (kind === 'weight')
      rows.push([
        names.get(e.reptileId),
        e.occurredAt.toISOString(),
        e.payload.grams,
        e.notes,
      ])
    else
      for (const f of e.payload.feeders as FeederEntry[])
        rows.push([
          names.get(e.reptileId),
          e.occurredAt.toISOString(),
          f.type,
          f.offered,
          f.consumed,
          f.size,
          f.gutLoaded,
          f.supplements,
          e.payload.appetite,
          e.notes,
        ])
  }
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

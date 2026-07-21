import type {
  ColonyType,
  FeederColony,
  FeederSettings,
  MaintenanceAction,
  MaintenanceLog,
} from '../../models'

const prefixes: Record<ColonyType, string> = {
  'discoid-breeder': 'DR-B',
  'discoid-grow-out': 'DR-G',
  'cricket-breeder': 'CR-B',
  mealworm: 'MW',
  superworm: 'SW',
  'fruit-fly': 'FF',
  isopod: 'ISO',
  other: 'OT',
}
export function nextRecordCode(prefix: string, existing: string[]) {
  const maximum = existing
    .filter((value) => value.startsWith(`${prefix}-`))
    .reduce(
      (max, value) => Math.max(max, Number(value.split('-').at(-1)) || 0),
      0,
    )
  return `${prefix}-${String(maximum + 1).padStart(3, '0')}`
}
export function colonyPrefix(type: ColonyType) {
  return prefixes[type]
}
export function estimatedHatchDate(eggsMovedAt: Date, incubationDays: number) {
  const date = new Date(eggsMovedAt)
  date.setDate(date.getDate() + incubationDays)
  return date
}
export function maintenanceDueDate(
  logs: MaintenanceLog[],
  action: MaintenanceAction,
  intervalDays: number,
  startedAt: Date,
) {
  const latest =
    logs
      .filter((log) => log.action === action)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0]
      ?.occurredAt ?? startedAt
  const due = new Date(latest)
  due.setDate(due.getDate() + intervalDays)
  return due
}
export function intervalFor(
  colony: FeederColony,
  action: 'feeding' | 'moisture-added' | 'cleaning',
  settings: FeederSettings[],
) {
  const group = colony.type.startsWith('cricket')
    ? 'cricket'
    : colony.type.startsWith('discoid')
      ? 'discoid'
      : colony.type === 'fruit-fly'
        ? 'fruit-fly'
        : 'default'
  const key = `${group}.${action}`
  return (
    settings.find((item) => item.key === key)?.value ??
    (action === 'cleaning' ? 7 : 2)
  )
}
export function isLowStock(quantity: number, minimum: number) {
  return quantity <= minimum
}
export function resolveQrRoute(value: string) {
  const trimmed = value.trim()
  let type: string | undefined
  let id: string | undefined

  const legacy = /^orchard:(colony|cricket|inventory):([\w-]+)$/.exec(trimmed)
  if (legacy) {
    type = legacy[1]
    id = legacy[2]
  } else {
    try {
      const url = new URL(trimmed)
      const match =
        /^\/feeders\/(colonies|crickets|inventory)\/([\w-]+)\/?$/.exec(
          url.pathname,
        )
      if (!match) return undefined
      type =
        match[1] === 'colonies'
          ? 'colony'
          : match[1] === 'crickets'
            ? 'cricket'
            : 'inventory'
      id = match[2]
    } catch {
      return undefined
    }
  }

  if (!type || !id) return undefined
  const segment =
    type === 'colony'
      ? 'colonies'
      : type === 'cricket'
        ? 'crickets'
        : 'inventory'
  return `/feeders/${segment}/${id}`
}

export function feederQrUrl(value: string, origin: string) {
  const route = resolveQrRoute(value)
  if (!route) throw new Error('Invalid Orchard feeder QR value.')
  return new URL(route, origin).toString()
}

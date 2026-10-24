import type { TimelineEvent } from '../../models'
import type { CreateInput } from '../../db/repositories/BaseRepository'

export const healthStatuses = {
  healthy: 'Healthy',
  monitoring: 'Monitoring',
  treatment: 'In treatment',
  quarantined: 'Quarantined',
}
export type HealthStatus = keyof typeof healthStatuses
export function isHealthEvent(event: TimelineEvent) {
  return (
    event.metadata?.feature === 'plant-health-v1' &&
    typeof event.metadata.healthStatus === 'string' &&
    Object.hasOwn(healthStatuses, event.metadata.healthStatus)
  )
}
export function healthHistory(events: TimelineEvent[], plantId: string) {
  return events
    .filter((event) => event.plantId === plantId && isHealthEvent(event))
    .sort(
      (a, b) =>
        b.occurredAt.getTime() - a.occurredAt.getTime() ||
        b.createdAt.getTime() - a.createdAt.getTime() ||
        b.id.localeCompare(a.id),
    )
}
export function healthByPlant(events: TimelineEvent[]) {
  const latest = new Map<string, TimelineEvent>()
  for (const event of events) {
    if (!event.plantId || !isHealthEvent(event)) continue
    const prior = latest.get(event.plantId)
    if (!prior || healthHistory([prior, event], event.plantId)[0] === event)
      latest.set(event.plantId, event)
  }
  return new Map(
    [...latest].map(([id, event]) => [
      id,
      event.metadata!.healthStatus as HealthStatus,
    ]),
  )
}
export function healthObservation(
  plantId: string,
  status: HealthStatus,
  notes: string,
  mediaId?: string,
): CreateInput<TimelineEvent> {
  if (!plantId || !Object.hasOwn(healthStatuses, status))
    throw new Error('Choose a plant and valid health status.')
  if (notes.length > 10000)
    throw new Error('Please keep health notes under 10,000 characters.')
  return {
    plantId,
    eventType: 'observation',
    title: `Health: ${healthStatuses[status]}`,
    description: notes.trim() || undefined,
    occurredAt: new Date(),
    isManual: true,
    metadata: {
      feature: 'plant-health-v1',
      healthStatus: status,
      ...(mediaId ? { mediaId } : {}),
    },
  }
}

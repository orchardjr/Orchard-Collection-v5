import type { TimelineEvent } from '../../models'
export function filterTimeline(
  events: TimelineEvent[],
  {
    search,
    type,
    plantId,
    spaceId,
    from,
    to,
  }: {
    search: string
    type: string
    plantId: string
    spaceId: string
    from: string
    to: string
  },
) {
  const query = search.trim().toLowerCase()
  const start = from ? new Date(`${from}T00:00:00`) : undefined
  const end = to ? new Date(`${to}T23:59:59`) : undefined
  return [...events]
    .filter(
      (event) =>
        (!query ||
          `${event.title} ${event.description ?? ''}`
            .toLowerCase()
            .includes(query)) &&
        (!type || event.eventType === type) &&
        (!plantId || event.plantId === plantId) &&
        (!spaceId || event.spaceId === spaceId) &&
        (!start || event.occurredAt >= start) &&
        (!end || event.occurredAt <= end),
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
}

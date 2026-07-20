import { Clock3, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import type { CreateInput } from '../db/repositories'
import { ObservationDialog } from '../features/timeline/ObservationDialog'
import { filterTimeline } from '../features/timeline/timelineFilters'
import {
  usePlants,
  useSpaces,
  useTimeline,
  useTimelineMutations,
} from '../hooks/useOrchardData'
import type { TimelineEvent } from '../models'
export function TimelinePage() {
  const { data: events = [], isLoading } = useTimeline()
  const { data: plants = [] } = usePlants()
  const { data: spaces = [] } = useSpaces()
  const m = useTimelineMutations()
  const [editing, setEditing] = useState<TimelineEvent | null>()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [plantId, setPlant] = useState('')
  const [spaceId, setSpace] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(50)
  const visible = useMemo(
    () => filterTimeline(events, { search, type, plantId, spaceId, from, to }),
    [events, from, plantId, search, spaceId, to, type],
  )
  const error = Object.values(m).find((x) => x.error instanceof Error)?.error
  const save = async (input: Omit<CreateInput<TimelineEvent>, 'isManual'>) => {
    if (editing)
      await m.updateObservation.mutateAsync({ id: editing.id, input })
    else await m.createObservation.mutateAsync(input)
    setEditing(undefined)
  }
  const groups = new Map<string, TimelineEvent[]>()
  visible.slice(0, limit).forEach((event) => {
    const key = event.occurredAt.toLocaleDateString(undefined, {
      dateStyle: 'long',
    })
    groups.set(key, [...(groups.get(key) ?? []), event])
  })
  return (
    <Page
      title="Timeline"
      subtitle="The complete history of your collection."
      actions={
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} />
          Add observation
        </Button>
      }
    >
      <div className="mb-6 grid gap-2 rounded-2xl border border-border bg-surface p-3 md:grid-cols-3">
        <input
          aria-label="Search timeline"
          placeholder="Search events…"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Event type"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All event types</option>
          {[...new Set(events.map((e) => e.eventType))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Plant filter"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={plantId}
          onChange={(e) => setPlant(e.target.value)}
        >
          <option value="">All plants</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname}
            </option>
          ))}
        </select>
        <select
          aria-label="Space filter"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={spaceId}
          onChange={(e) => setSpace(e.target.value)}
        >
          <option value="">All spaces</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="text-xs text-muted-foreground">
          From
          <input
            type="date"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          To
          <input
            type="date"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {error instanceof Error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">
          {error.message}
        </p>
      )}
      {isLoading ? (
        <Skeleton className="h-80" />
      ) : visible.length ? (
        <div className="space-y-7">
          {[...groups].map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 font-display text-lg font-semibold">
                {date}
              </h2>
              <div className="space-y-3">
                {items.map((event) => {
                  const plant = plants.find((p) => p.id === event.plantId)
                  return (
                    <Card key={event.id}>
                      <div className="flex gap-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                          <Clock3 size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{event.title}</h3>
                            <Badge variant="accent">{event.eventType}</Badge>
                          </div>
                          {event.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <time>
                              {event.occurredAt.toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </time>
                            {plant && (
                              <Link
                                className="font-semibold text-accent"
                                to={`/collection/${plant.id}`}
                              >
                                {plant.nickname}
                              </Link>
                            )}
                          </div>
                        </div>
                        {event.isManual && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              className="size-9 px-0"
                              aria-label="Edit observation"
                              onClick={() => setEditing(event)}
                            >
                              <Pencil size={15} />
                            </Button>
                            <Button
                              variant="ghost"
                              className="size-9 px-0"
                              aria-label="Delete observation"
                              onClick={() =>
                                window.confirm('Delete this observation?') &&
                                m.deleteObservation.mutate(event.id)
                              }
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
          {visible.length > limit && (
            <Button
              variant="secondary"
              onClick={() => setLimit((value) => value + 50)}
            >
              Load more
            </Button>
          )}
        </div>
      ) : (
        <EmptyState
          icon={Clock3}
          title="No matching events"
          description="Record an observation or adjust the filters."
        />
      )}
      {editing !== undefined && (
        <ObservationDialog
          key={editing?.id ?? 'new'}
          event={editing ?? undefined}
          plants={plants}
          error={error instanceof Error ? error.message : undefined}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}
    </Page>
  )
}

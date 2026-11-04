import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import type { ReptileData } from './types'
export function SupplementCalendar({
  data,
  reptileId,
  onComplete,
  busy,
}: {
  data: ReptileData
  reptileId?: string
  onComplete: (id: string) => void
  busy: boolean
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [day, setDay] = useState<number>()
  const routines = new Map(
    data.routines
      .filter(
        (r) =>
          r.type === 'supplement' && (!reptileId || r.reptileId === reptileId),
      )
      .map((r) => [r.id, r]),
  )
  const tasks = data.tasks.filter(
    (t) =>
      routines.has(t.reptileRoutineId!) &&
      t.dueAt &&
      t.dueAt.getMonth() === month.getMonth() &&
      t.dueAt.getFullYear() === month.getFullYear(),
  )
  const length = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate()
  const selected = tasks
    .filter((t) => !day || t.dueAt?.getDate() === day)
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          aria-label="Previous supplement month"
          onClick={() => {
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            setDay(undefined)
          }}
        >
          Previous
        </Button>
        <h3>
          {month.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <Button
          variant="secondary"
          aria-label="Next supplement month"
          onClick={() => {
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            setDay(undefined)
          }}
        >
          Next
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span className="text-center text-xs" key={d}>
            {d}
          </span>
        ))}
        {Array.from({ length: month.getDay() }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length }, (_, i) => (
          <button
            key={i}
            className={`min-h-11 rounded-lg border border-border p-1 text-sm ${day === i + 1 ? 'bg-accent-soft' : ''}`}
            onClick={() => setDay(i + 1)}
            aria-label={`${month.toLocaleDateString(undefined, { month: 'long' })} ${i + 1}, ${tasks.filter((t) => t.dueAt?.getDate() === i + 1).length} supplement tasks`}
          >
            {i + 1}
            {tasks.some((t) => t.dueAt?.getDate() === i + 1) && (
              <span className="block text-xs">●</span>
            )}
          </button>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setDay(undefined)}>
        Show entire month
      </Button>
      <p className="text-xs text-muted-foreground">
        Calendar shows saved occurrences, not ungenerated future doses. Next
        occurrences appear after completion. Past open doses are overdue, not
        assumed administered.
      </p>
      {selected.length === 0 && (
        <p>No scheduled occurrences in this selection.</p>
      )}
      {selected.map((t) => {
        const r = routines.get(t.reptileRoutineId!)!
        const product = data.supplements.find((s) => s.id === r.supplementId)
        const overlap =
          product?.d3 === 'yes' &&
          tasks.some(
            (other) =>
              other.id !== t.id &&
              other.dueAt?.toDateString() === t.dueAt?.toDateString() &&
              routines.get(other.reptileRoutineId!)?.reptileId ===
                r.reptileId &&
              data.supplements.find(
                (s) =>
                  s.id === routines.get(other.reptileRoutineId!)?.supplementId,
              )?.d3 === 'yes',
          )
        return (
          <article key={t.id} className="rounded-xl border border-border p-3">
            <p className="font-semibold">
              {product?.name} ·{' '}
              {data.reptiles.find((a) => a.id === r.reptileId)?.name}
            </p>
            <p>
              {t.dueAt?.toLocaleString()} ·{' '}
              {t.status === 'skipped'
                ? 'Missed'
                : t.status === 'completed'
                  ? 'Completed'
                  : t.status === 'archived'
                    ? 'Archived'
                    : t.dueAt! < new Date()
                      ? 'Overdue'
                      : 'Upcoming'}
            </p>
            <p className="text-sm">
              D3: {product?.d3 ?? 'unknown'}
              {overlap
                ? ' — Multiple D3-containing products on this date. Review your plan.'
                : ''}
            </p>
            {t.status === 'open' && (
              <Button disabled={busy} onClick={() => onComplete(t.id)}>
                Mark as Given
              </Button>
            )}
            {t.completedAt && (
              <p className="text-xs">
                Actually given: {t.completedAt.toLocaleString()}
              </p>
            )}
          </article>
        )
      })}
    </section>
  )
}

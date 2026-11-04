import { useState } from 'react'
import type { ReptileEvent } from './types'
import { rangeStart, weightHistory } from './calculations'
export function WeightPanel({ events }: { events: ReptileEvent[] }) {
  const [range, setRange] = useState('all')
  const [point, setPoint] = useState<string>()
  const history = weightHistory(events)
  const rows = history.filter(
    (row) => row.event.occurredAt >= rangeStart(range),
  )
  const latest = history.at(-1)
  const min = Math.min(...rows.map((r) => r.grams), 0)
  const max = Math.max(...rows.map((r) => r.grams), 1)
  const first = rows[0]?.event.occurredAt.getTime() ?? 0
  const last = rows.at(-1)?.event.occurredAt.getTime() ?? 1
  const x = (date: Date) =>
    45 + ((date.getTime() - first) / Math.max(1, last - first)) * 500
  const y = (g: number) => 210 - ((g - min) / Math.max(1, max - min)) * 175
  return (
    <section className="space-y-3">
      <p>
        Latest: {latest?.grams ?? '—'} g · Previous: {latest?.previous ?? '—'} g
        · Change: {latest?.change?.toFixed(2) ?? '—'} g (
        {latest?.percent?.toFixed(1) ?? '—'}%)
      </p>
      <p className="text-sm text-muted-foreground">
        Weight change alone does not indicate good or poor health.
      </p>
      <label>
        Chart range{' '}
        <select
          className="min-h-11 rounded-lg border border-border bg-background p-2"
          value={range}
          onChange={(e) => {
            setRange(e.target.value)
            setPoint(undefined)
          }}
        >
          {[
            ['30', '30 days'],
            ['90', '90 days'],
            ['6m', '6 months'],
            ['1y', '1 year'],
            ['all', 'All'],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {rows.length ? (
        <svg
          viewBox="0 0 600 250"
          className="w-full"
          role="img"
          aria-label="Weight over time in grams"
        >
          <line x1="45" x2="550" y1="210" y2="210" stroke="currentColor" />
          <text x="4" y="25" fill="currentColor" fontSize="12">
            {max.toFixed(1)} g
          </text>
          <text x="4" y="210" fill="currentColor" fontSize="12">
            {min} g
          </text>
          <polyline
            points={rows
              .map((r) => `${x(r.event.occurredAt)},${y(r.grams)}`)
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {rows.map((r) => (
            <circle
              key={r.event.id}
              cx={x(r.event.occurredAt)}
              cy={y(r.grams)}
              r="6"
              fill="currentColor"
              tabIndex={0}
              role="button"
              aria-label={`${r.event.occurredAt.toLocaleDateString()}: ${r.grams} grams`}
              onFocus={() => setPoint(r.event.id)}
              onMouseEnter={() => setPoint(r.event.id)}
              onClick={() => setPoint(r.event.id)}
            >
              <title>
                {r.event.occurredAt.toLocaleString()} — {r.grams} g
              </title>
            </circle>
          ))}
          <text x="45" y="240" fill="currentColor" fontSize="12">
            {rows[0]?.event.occurredAt.toLocaleDateString()}
          </text>
          <text x="430" y="240" fill="currentColor" fontSize="12">
            {rows.at(-1)?.event.occurredAt.toLocaleDateString()}
          </text>
        </svg>
      ) : (
        <p>No measurements in this range.</p>
      )}
      {point && (
        <p role="status">
          {rows
            .find((r) => r.event.id === point)
            ?.event.occurredAt.toLocaleString()}
          : {rows.find((r) => r.event.id === point)?.grams} g
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((r) => (
              <tr key={r.event.id}>
                <td className="py-2">{r.event.occurredAt.toLocaleString()}</td>
                <td>{r.grams} g</td>
                <td>
                  {r.change === undefined
                    ? '—'
                    : `${r.change.toFixed(2)} g (${r.percent?.toFixed(1)}%)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

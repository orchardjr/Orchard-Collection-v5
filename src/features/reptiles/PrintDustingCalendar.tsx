import { useMemo, useState } from 'react'
import { DialogShell } from '../../components/ui/DialogShell'
import { Button } from '../../components/ui/Button'
import { buildDustingCalendar } from './dustingCalendar'
import { dustingPdf, dustingText } from './dustingPdf'
import { downloadFile } from './report'
import type { ReptileData } from './types'

export function PrintDustingCalendar({
  data,
  reptileId,
  onClose,
}: {
  data: ReptileData
  reptileId?: string
  onClose: () => void
}) {
  const animals = data.reptiles.filter(
    (a) => a.status === 'active' && !a.deleting,
  )
  const [ids, setIds] = useState(
    reptileId ? [reptileId] : animals.map((a) => a.id),
  )
  const [month, setMonth] = useState(
    () =>
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  )
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const result = useMemo(() => {
    try {
      return { calendar: buildDustingCalendar(data, ids, month), error: '' }
    } catch (e) {
      return {
        calendar: undefined,
        error: e instanceof Error ? e.message : 'Could not prepare calendar.',
      }
    }
  }, [data, ids, month])
  const download = async () => {
    if (!result.calendar || busy) return
    setBusy(true)
    setError('')
    try {
      const pdf = await dustingPdf(result.calendar)
      downloadFile(pdf.output('blob'), `orchard-dusting-${month}.pdf`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate PDF.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogShell
      title="Print Dusting Calendar"
      description="Landscape Letter PDF with daily supplements and paper checkboxes."
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="space-y-4 p-5">
        <fieldset disabled={busy} className="min-w-0 space-y-3">
          <label className="block">
            Calendar month
            <input
              aria-label="Calendar month"
              type="month"
              min="1900-01"
              max="2200-12"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3"
            />
          </label>
          <Button
            variant="secondary"
            onClick={() => setIds(animals.map((a) => a.id))}
          >
            Select all active reptiles
          </Button>
          <label className="block">
            Find reptile
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3"
            />
          </label>
          <div className="max-h-48 overflow-y-auto">
            {animals
              .filter((a) =>
                a.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((a) => (
                <label key={a.id} className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={ids.includes(a.id)}
                    onChange={(e) =>
                      setIds((old) =>
                        e.target.checked
                          ? [...old, a.id]
                          : old.filter((id) => id !== a.id),
                      )
                    }
                  />
                  {a.name}
                </label>
              ))}
          </div>
        </fieldset>
        <p className="text-sm">
          Future dates are planned estimates, not proof of administration.
          Completing tasks late can shift later dates. Dates follow each
          routine’s saved timezone.
        </p>
        {(error || result.error) && <p role="alert">{error || result.error}</p>}
        <Button
          disabled={busy || !result.calendar?.animalCount}
          onClick={() => void download()}
        >
          {busy ? 'Preparing PDF…' : 'Download calendar PDF'}
        </Button>
        <p className="text-sm">
          Open the downloaded PDF and print on Letter paper in landscape. Busy
          days continue on detail pages; no doses are omitted.
        </p>
        {result.calendar && (
          <section aria-label="Dusting calendar preview" className="space-y-3">
            <h3 className="font-semibold">
              {month} · {result.calendar.entries.length} scheduled / planned
              doses
            </h3>
            <p className="text-xs">
              Timezones: {result.calendar.zones.join(', ') || 'No schedules'}
            </p>
            {!result.calendar.entries.length && (
              <p>No dated doses for this month.</p>
            )}
            {[...new Set(result.calendar.entries.map((e) => e.day))].map(
              (day) => (
                <div key={day} className="rounded-xl border border-border p-3">
                  <h4 className="font-semibold">{day}</h4>
                  {result
                    .calendar!.entries.filter((e) => e.day === day)
                    .map((entry, i) => (
                      <p key={i} className="mt-2 break-words text-sm">
                        ☐ {dustingText(entry)}
                      </p>
                    ))}
                </div>
              ),
            )}
            {result.calendar.reminders.length > 0 && (
              <div>
                <h4 className="font-semibold">Every-feeding reminders</h4>
                {result.calendar.reminders.map((text, i) => (
                  <p key={i} className="mt-2 text-sm">
                    {text}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </DialogShell>
  )
}

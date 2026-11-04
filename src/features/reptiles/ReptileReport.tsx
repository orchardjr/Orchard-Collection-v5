import { useState } from 'react'
import { DialogShell } from '../../components/ui/DialogShell'
import { Button } from '../../components/ui/Button'
import { careReport, downloadFile, reportSections } from './report'
import { eventCsv } from './calculations'
import type { ReptileData } from './types'
export function ReptileReport({
  data,
  initialIds,
  onClose,
}: {
  data: ReptileData
  initialIds: string[]
  onClose: () => void
}) {
  const [ids, setIds] = useState(new Set(initialIds))
  const [sections, setSections] = useState(new Set<string>(reportSections))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const build = async (print: boolean) => {
    if (busy) return
    setBusy(true)
    setError('')
    const target = print ? window.open('', '_blank') : null
    try {
      if (print && !target)
        throw new Error(
          'Allow popups to open the printable PDF, or download it instead.',
        )
      const pdf = await careReport(data, [...ids], [...sections])
      if (target) {
        pdf.autoPrint()
        const url = URL.createObjectURL(pdf.output('blob'))
        target.location.href = url
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } else downloadFile(pdf.output('blob'), 'orchard-reptile-care.pdf')
    } catch (e) {
      target?.close()
      setError(e instanceof Error ? e.message : 'Report failed.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogShell
      title="Reptile Care Report"
      description="Letter-size PDF, printing and CSV exports. Reports contain private health notes."
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="space-y-4 p-5">
        <fieldset disabled={busy} className="space-y-2">
          <legend className="font-semibold">Reptiles</legend>
          {data.reptiles.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={ids.has(a.id)}
                onChange={(e) =>
                  setIds((old) => {
                    const next = new Set(old)
                    if (e.target.checked) next.add(a.id)
                    else next.delete(a.id)
                    return next
                  })
                }
              />
              {a.name} ({a.status})
            </label>
          ))}
        </fieldset>
        <fieldset disabled={busy} className="grid gap-2 sm:grid-cols-2">
          <legend className="font-semibold">Sections</legend>
          {reportSections.map((section) => (
            <label key={section} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={sections.has(section)}
                onChange={(e) =>
                  setSections((old) => {
                    const next = new Set(old)
                    if (e.target.checked) next.add(section)
                    else next.delete(section)
                    return next
                  })
                }
              />
              {section}
            </label>
          ))}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy || !ids.size || !sections.size}
            onClick={() => void build(false)}
          >
            Download PDF
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !ids.size || !sections.size}
            onClick={() => void build(true)}
          >
            Open PDF to print
          </Button>
          {(['weight', 'feeding'] as const).map((kind) => (
            <Button
              key={kind}
              variant="secondary"
              disabled={busy || !ids.size}
              onClick={() =>
                downloadFile(
                  new Blob(
                    [
                      eventCsv(
                        data.events.filter((e) => ids.has(e.reptileId)),
                        kind,
                        new Map(data.reptiles.map((a) => [a.id, a.name])),
                      ),
                    ],
                    { type: 'text/csv;charset=utf-8' },
                  ),
                  `reptile-${kind}.csv`,
                )
              }
            >
              Export {kind} CSV
            </Button>
          ))}
        </div>
        <p className="text-sm">
          {ids.size} reptiles selected. Print on Letter paper. PDF includes
          selectable text and a vector weight chart; photo attachments are not
          embedded.
        </p>
      </div>
    </DialogShell>
  )
}

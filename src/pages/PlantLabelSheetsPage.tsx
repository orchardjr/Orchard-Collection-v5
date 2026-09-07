import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useCollectionPrintData } from '../features/plants/useCollectionPrintData'
import {
  collectionAuditByPlant,
  collectionAuditFilters,
} from '../features/plants/collectionPrint'
import { PlantBatchSelector } from '../features/labels/PlantBatchSelector'
import {
  labelFields,
  labelEntries,
  letterLabelLayout,
  selectPlantLabelPlants,
  type LabelSelectionContext,
  type PlantLabelField,
  type PlantLabelSort,
  type PlantLabelSource,
} from '../features/labels/plantLabelSheets'
import type { PlantLabelDocument } from '../services/PlantLabelPdfService'

const field =
  'min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3'
export function PlantLabelSheetsPage() {
  const context = (useLocation().state ?? {}) as LabelSelectionContext
  const { plants, spaces, media, tags, loading, error, retry, local } =
    useCollectionPrintData()
  const [source, setSource] = useState<PlantLabelSource>(
    context.initialSource ?? 'active',
  )
  const [selected, setSelected] = useState(new Set(context.selectedIds ?? []))
  const [sort, setSort] = useState<PlantLabelSort>('name')
  const [copies, setCopies] = useState(1)
  const [fields, setFields] = useState(
    new Set<PlantLabelField>(['name', 'botanical', 'cultivar']),
  )
  const [borders, setBorders] = useState(true)
  const [qr, setQr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [preview, setPreview] = useState<{
    signature: string
    document: PlantLabelDocument
  }>()
  const [page, setPage] = useState(0)
  const audit = useMemo(
    () => collectionAuditByPlant(tags, media),
    [tags, media],
  )
  const filtered = useMemo(
    () => new Set(context.filteredIds ?? []),
    [context.filteredIds],
  )
  const chosen = useMemo(
    () =>
      selectPlantLabelPlants(
        plants,
        spaces,
        audit,
        source,
        selected,
        filtered,
        sort,
      ),
    [plants, spaces, audit, source, selected, filtered, sort],
  )
  const validCopies = Number.isInteger(copies) && copies >= 1 && copies <= 10
  const total = validCopies ? labelEntries(chosen, copies).length : 0
  const pages = Math.ceil(total / letterLabelLayout.perPage)
  const signature = JSON.stringify([
    chosen,
    spaces,
    chosen.map((p) => audit.get(p.id)),
    [...fields].sort(),
    copies,
    borders,
    qr,
    local,
  ])
  const current = preview?.signature === signature && !error && !loading
  const sheet = current ? preview.document.sheets[page] : undefined
  const generate = async () => {
    setBusy(true)
    setFailure('')
    try {
      const { createPlantLabelPdf } =
        await import('../services/PlantLabelPdfService')
      const document = await createPlantLabelPdf(chosen, spaces, audit, {
        fields,
        copies,
        borders,
        qr,
        localOnly: local,
      })
      setPreview({ signature, document })
      setPage(0)
    } catch (err) {
      setFailure(
        err instanceof Error ? err.message : 'Could not generate labels.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 text-foreground">
      <Link
        to="/collection/print"
        className="text-sm font-semibold text-accent"
      >
        Back to Print Collection
      </Link>
      <h1 className="font-display text-3xl font-semibold">Plant Labels</h1>
      <p>Create 2.5″ × 0.5″ printable labels on US Letter sheets.</p>
      {error && (
        <div role="alert">
          Could not verify the collection.{' '}
          <Button onClick={() => void retry()}>Retry</Button>
        </div>
      )}
      {loading && <p role="status">Loading collection…</p>}
      <fieldset
        disabled={busy}
        className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-4"
      >
        <legend className="px-2 font-semibold">Label setup</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="min-w-0 text-sm">
            Plants to label
            <select
              className={field}
              value={source}
              onChange={(e) => setSource(e.target.value as PlantLabelSource)}
            >
              <option value="active">All active plants</option>
              <option value="selected">Selected plants</option>
              <option value="filtered" disabled={!context.filteredIds}>
                Current filtered collection
              </option>
              {collectionAuditFilters
                .filter((option) => option.id !== 'all')
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="min-w-0 text-sm">
            Sort labels
            <select
              className={field}
              value={sort}
              onChange={(e) => setSort(e.target.value as PlantLabelSort)}
            >
              <option value="name">Plant name A–Z</option>
              <option value="botanical">Botanical name A–Z</option>
              <option value="id">Plant/accession ID</option>
              <option value="space">Space/location</option>
              <option value="createdAt">Date added</option>
            </select>
          </label>
          <label className="text-sm">
            Copies per plant
            <input
              className={field}
              type="number"
              min={1}
              max={10}
              step={1}
              value={copies}
              onChange={(e) => setCopies(e.target.valueAsNumber)}
            />
          </label>
        </div>
        {!validCopies && <p role="alert">Copies per plant must be 1 to 10.</p>}
        <p className="text-xs text-muted-foreground">
          Audit choices include active plants. Current filtered collection uses
          the plants passed from Collection or Print Collection. Selected plants
          can include archived plants explicitly chosen in the picker.
        </p>
        {source === 'selected' ? (
          <PlantBatchSelector
            plants={plants}
            spaces={spaces}
            selected={selected}
            onChange={setSelected}
            additive
          />
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setSelected(new Set(chosen.map((p) => p.id)))
              setSource('selected')
            }}
          >
            Choose individual plants
          </Button>
        )}
        <fieldset>
          <legend className="text-sm font-semibold">Label content</legend>
          <div className="flex flex-wrap gap-x-5">
            {labelFields.map((item) => (
              <label
                key={item.id}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={fields.has(item.id)}
                  onChange={() =>
                    setFields((old) => {
                      const next = new Set(old)
                      if (next.has(item.id)) next.delete(item.id)
                      else next.add(item.id)
                      return next
                    })
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={borders}
            onChange={(e) => setBorders(e.target.checked)}
          />
          Show label borders / cutting guides
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={qr}
            disabled={local}
            onChange={(e) => setQr(e.target.checked)}
          />
          Include QR code
        </label>
        <p className="text-xs text-muted-foreground">
          QR links to the existing plant detail page; sign-in and ownership
          rules still apply. Local-only plants have no QR. Codes are small:
          test-scan a printed label before printing a large batch.
        </p>
        <p className="text-xs text-muted-foreground">
          Long text is shortened with “…”. More fields or QR leave less text
          space. For the most readable labels, include fewer fields. No photos
          are printed.
        </p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={
            busy ||
            loading ||
            !!error ||
            !total ||
            !validCopies ||
            (!fields.size && !qr)
          }
          onClick={() => void generate()}
        >
          <Printer size={16} />
          {busy ? 'Preparing sheets…' : 'Preview label sheets'}
        </Button>
        <Button
          variant="secondary"
          disabled={!current || busy}
          onClick={() =>
            preview?.document.pdf.save('orchard-plant-labels-letter.pdf')
          }
        >
          <Download size={16} />
          Download label PDF
        </Button>
      </div>
      <p className="font-semibold">
        Print at Actual Size / 100%. Do not use Fit to Page.
      </p>
      {failure && <p role="alert">{failure}</p>}
      <section aria-label="Label sheet preview" className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Sheet preview</h2>
        <p aria-live="polite">
          {total} labels • {letterLabelLayout.perPage} labels per sheet •{' '}
          {pages} {pages === 1 ? 'page' : 'pages'}
        </p>
        <p className="text-sm text-muted-foreground">
          US Letter • 3 columns × 17 rows • 0.375″ side margins • 0.5″
          top/bottom minimum • gaps: 0.125″ across, 0.0625″ down
        </p>
        {!current && (
          <p>
            {preview
              ? 'Settings changed. Update the preview before downloading.'
              : 'Choose your settings, then preview the actual label sheets.'}
          </p>
        )}
        {sheet && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous sheet
              </Button>
              <span>
                Sheet {page + 1} of {preview!.document.sheets.length}
              </span>
              <Button
                variant="secondary"
                disabled={page + 1 >= preview!.document.sheets.length}
                onClick={() => setPage(page + 1)}
              >
                Next sheet
              </Button>
            </div>
            <svg
              viewBox="0 0 612 792"
              role="img"
              aria-label={`Letter sheet ${page + 1} with ${sheet.length} labels`}
              className="mx-auto block w-full max-w-[8.5in] border border-border bg-white shadow-card"
            >
              <rect width="612" height="792" fill="white" />
              {sheet.map((label, i) => (
                <g key={i} transform={`translate(${label.x} ${label.y})`}>
                  {preview!.document.borders && (
                    <rect
                      x=".125"
                      y=".125"
                      width="179.75"
                      height="35.75"
                      fill="none"
                      stroke="black"
                      strokeWidth=".25"
                    />
                  )}
                  {label.text.map((line, j) => (
                    <text
                      key={j}
                      x={line.x}
                      y={line.y}
                      fontSize={line.size}
                      fontWeight={line.bold ? 'bold' : 'normal'}
                      fontFamily="OrchardLabel"
                      fill="black"
                    >
                      {line.text}
                    </text>
                  ))}
                  {label.qr && (
                    <g
                      transform={`translate(${label.qr.x} ${label.qr.y}) scale(${label.qr.size / label.qr.modules})`}
                      fill="black"
                    >
                      {label.qr.dark.map((cell, j) => (
                        <rect
                          key={j}
                          x={cell.x}
                          y={cell.y}
                          width="1"
                          height="1"
                        />
                      ))}
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </>
        )}
      </section>
    </main>
  )
}

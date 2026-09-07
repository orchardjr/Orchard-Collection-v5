import { ArrowLeft, CheckSquare, Printer, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { OrchardImage } from '../features/media/OrchardImage'
import { selectPlantCardMedia } from '../features/media/mediaSelectors'
import {
  collectionPrintFields,
  collectionAuditByPlant,
  collectionAuditFilters,
  collectionAuditSummary,
  type CollectionAuditFilter,
  collectionPrintValue,
  defaultCollectionPrintFields,
  defaultCollectionPrintStatus,
  prepareCollectionPrintPlants,
  selectedCollectionPrintFields,
  type CollectionPrintField,
  type CollectionPrintSort,
} from '../features/plants/collectionPrint'
import type { PlantStatusFilter } from '../features/plants/plantFilters'
import { useCollectionPrintData } from '../features/plants/useCollectionPrintData'

export function CollectionPrintPage() {
  const { plants, spaces, media, tags, loading, error, retry } =
    useCollectionPrintData()
  const [auditFilter, setAuditFilter] = useState<CollectionAuditFilter>('all')
  const [status, setStatus] = useState<PlantStatusFilter>(
    defaultCollectionPrintStatus,
  )
  const [sort, setSort] = useState<CollectionPrintSort>('name')
  const [fields, setFields] = useState(defaultCollectionPrintFields)
  const audit = useMemo(
    () => collectionAuditByPlant(tags, media),
    [tags, media],
  )

  const reportPlants = useMemo(
    () =>
      prepareCollectionPrintPlants(
        plants,
        spaces,
        status,
        sort,
        auditFilter,
        audit,
      ),
    [plants, sort, spaces, status, auditFilter, audit],
  )
  const summary = useMemo(
    () => collectionAuditSummary(reportPlants, audit),
    [reportPlants, audit],
  )
  const showAudit =
    auditFilter !== 'all' ||
    fields.has('nfcStatus') ||
    fields.has('photoStatus')
  const mediaByPlant = useMemo(() => {
    const grouped = new Map<string, typeof media>()
    for (const asset of media) {
      const assets = grouped.get(asset.plantId) ?? []
      assets.push(asset)
      grouped.set(asset.plantId, assets)
    }
    return new Map(
      [...grouped].map(([plantId, assets]) => [
        plantId,
        selectPlantCardMedia(assets),
      ]),
    )
  }, [media])
  const generatedAt = useMemo(() => new Date(), [])

  const toggleField = (field: CollectionPrintField) => {
    setFields((current) => {
      const next = new Set(current)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  return (
    <div className="collection-print-root min-h-screen bg-background text-foreground">
      <section className="collection-print-controls mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent"
            >
              <ArrowLeft size={16} /> Back to Collection
            </Link>
            <h1 className="mt-3 font-display text-4xl font-semibold">
              Print Collection
            </h1>
            <p className="mt-2 text-muted-foreground">
              Choose what appears, review the report, then print or save as PDF.
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            disabled={loading || !!error || reportPlants.length === 0}
          >
            <Printer size={17} /> Print report
          </Button>
        </div>
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-border p-4"
          >
            <p>
              Could not load the complete collection audit. Missing information
              cannot be determined until the data loads successfully.
            </p>
            <Button onClick={() => void retry()}>Retry loading report</Button>
          </div>
        )}

        <div className="mt-6 grid gap-5 rounded-[1.4rem] border border-border/75 bg-surface p-5 shadow-card lg:grid-cols-[auto_auto_1fr]">
          <label className="min-w-0 text-sm font-semibold lg:col-span-3">
            Collection Status / Missing Information
            <select
              aria-label="Collection Status / Missing Information"
              value={auditFilter}
              onChange={(event) =>
                setAuditFilter(event.target.value as CollectionAuditFilter)
              }
              className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3"
            >
              {collectionAuditFilters.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Within the selected Active / Archived / All scope.
            </span>
          </label>
          <label className="text-sm font-semibold">
            Plants
            <select
              aria-label="Plants to print"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as PlantStatusFilter)
              }
              className="mt-2 block h-11 rounded-xl border border-border bg-background px-3"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Sort by
            <select
              aria-label="Sort printed plants"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as CollectionPrintSort)
              }
              className="mt-2 block h-11 rounded-xl border border-border bg-background px-3"
            >
              <option value="name">Plant name</option>
              <option value="botanical">Genus / species</option>
              <option value="createdAt">Date added</option>
              <option value="space">Space / location</option>
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Fields to include</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {collectionPrintFields.map((field) => {
                const selected = fields.has(field.id)
                return (
                  <label
                    key={field.id}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => toggleField(field.id)}
                    />
                    {selected ? (
                      <CheckSquare size={14} />
                    ) : (
                      <Square size={14} />
                    )}
                    {field.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        </div>
      </section>

      <main className="collection-print-report mx-auto mb-12 max-w-[8.5in] bg-white px-[0.45in] py-[0.4in] text-black shadow-card print:shadow-none">
        <header className="collection-report-header border-b-2 border-[#315b3b] pb-3">
          <p className="text-[9pt] font-bold uppercase tracking-[0.18em] text-[#3f6f4a]">
            Collection report
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[20pt] font-semibold leading-none sm:text-[24pt] print:text-[24pt]">
              Orchard Collection
            </h2>
            <div className="text-right text-[8.5pt] leading-5 text-neutral-600">
              <p>
                {loading || error
                  ? 'Report pending'
                  : `${reportPlants.length} plants`}
              </p>
              <p>Generated {generatedAt.toLocaleDateString()}</p>
            </div>
          </div>
        </header>
        {showAudit && !loading && !error && (
          <section
            aria-label="Collection Audit"
            className="collection-audit-summary mt-3 rounded border border-neutral-300 p-2 text-[8pt]"
          >
            <h3 className="font-bold">Collection Audit</h3>
            <p>
              {summary.total} plants • {summary.withoutNfc} without NFC •{' '}
              {summary.withoutPhotos} without photos • {summary.missingBoth}{' '}
              missing both
            </p>
            <p className="mt-1 text-[7pt] text-neutral-600">
              Scope:{' '}
              {status === 'all'
                ? 'All'
                : status === 'active'
                  ? 'Active'
                  : 'Archived'}{' '}
              ·{' '}
              {
                collectionAuditFilters.find(
                  (option) => option.id === auditFilter,
                )?.label
              }{' '}
              · Counts describe plants in this report.
            </p>
          </section>
        )}

        {error ? (
          <p className="py-12 text-center text-sm">
            Report unavailable: collection data could not be verified.
          </p>
        ) : loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            Preparing collection report…
          </p>
        ) : reportPlants.length ? (
          <div className="collection-report-list mt-3 space-y-2">
            {reportPlants.map((plant, index) => {
              const asset = mediaByPlant.get(plant.id)
              return (
                <article
                  className="collection-report-row grid grid-cols-[0.55in_minmax(0,1fr)] gap-3 border-b border-neutral-300 pb-2"
                  key={plant.id}
                >
                  <div className="pt-0.5">
                    {asset ? (
                      <OrchardImage
                        alt=""
                        blob={undefined}
                        thumbnailBlob={asset.thumbnailBlob}
                        src={undefined}
                        thumbnailSrc={asset.thumbnailUrl}
                        loading="eager"
                        className="size-[0.52in] rounded-md border border-neutral-200 bg-neutral-100"
                        imageClassName="object-cover"
                      />
                    ) : (
                      <div className="grid size-[0.52in] place-items-center rounded-md border border-neutral-200 bg-neutral-50 text-[7pt] text-neutral-400">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {selectedCollectionPrintFields(fields).map(
                      ({ id, label }) => {
                        const value = collectionPrintValue(
                          plant,
                          id,
                          spaces,
                          audit.get(plant.id),
                        )
                        if (!value) return null
                        return (
                          <div
                            key={id}
                            className={
                              id === 'notes' || id === 'botanicalName'
                                ? 'col-span-2 sm:col-span-3'
                                : undefined
                            }
                          >
                            <dt className="text-[6.5pt] font-bold uppercase tracking-wide text-neutral-500">
                              {label}
                            </dt>
                            <dd
                              className={`mt-0.5 break-words text-[8pt] leading-[1.25] ${
                                id === 'botanicalName' ? 'italic' : ''
                              }`}
                            >
                              {value}
                              {id === 'nfcStatus' &&
                                audit.get(plant.id)?.nfcCode && (
                                  <span className="mt-0.5 block break-all text-[7pt] text-neutral-600">
                                    {audit.get(plant.id)?.nfcCode}
                                  </span>
                                )}
                            </dd>
                          </div>
                        )
                      },
                    )}
                  </dl>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-neutral-500">
            No plants match the selected report filters.
          </p>
        )}
        <footer className="collection-report-footer mt-4 border-t border-neutral-300 pt-2 text-center text-[7pt] text-neutral-500">
          Orchard Collection · <span className="collection-page-number" />
        </footer>
      </main>
    </div>
  )
}

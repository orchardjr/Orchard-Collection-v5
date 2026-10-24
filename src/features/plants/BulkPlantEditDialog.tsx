import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'
import type { Plant, Space } from '../../models'
import { isSupabaseConfigured } from '../../lib/supabase'
import {
  plantTagService,
  normalizeTagNames,
} from '../../services/PlantTagService'
import {
  bulkPlantService,
  validateBulkPlantChanges,
  type BulkPlantChanges,
  type BulkPlantResult,
} from '../../services/BulkPlantService'

const field =
  'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm'
type IntervalMode = 'unchanged' | 'set' | 'disabled'

export function BulkPlantEditDialog({
  plants,
  spaces,
  onClose,
  onSaved,
}: {
  plants: Plant[]
  spaces: Space[]
  onClose: () => void
  onSaved: () => void
}) {
  const client = useQueryClient()
  const [space, setSpace] = useState('unchanged')
  const [addTags, setAddTags] = useState('')
  const [removeTags, setRemoveTags] = useState<string[]>([])
  const [waterMode, setWaterMode] = useState<IntervalMode>('unchanged')
  const [fertilizerMode, setFertilizerMode] =
    useState<IntervalMode>('unchanged')
  const [waterDays, setWaterDays] = useState('7')
  const [fertilizerDays, setFertilizerDays] = useState('14')
  const [confirmed, setConfirmed] = useState<BulkPlantChanges>()
  const [result, setResult] = useState<BulkPlantResult>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [progress, setProgress] = useState('')
  const tags = useQuery({
    queryKey: ['plant-tag-catalog'],
    queryFn: () => plantTagService.list(),
    enabled: isSupabaseConfigured,
  })
  const refresh = () =>
    Promise.all(
      [
        'plants',
        'spaces',
        'tasks',
        'dashboard',
        'timeline',
        'plant-assignment-tags',
        'plant-tag-catalog',
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    )
  const review = () => {
    try {
      const interval = (mode: IntervalMode, days: string) => {
        if (mode === 'unchanged') return undefined
        if (mode === 'disabled') return 0
        const value = Number(days)
        if (!days.trim() || value < 1)
          throw new Error(
            'Enter an interval of at least 1 day, or choose Disable.',
          )
        return value
      }
      const changes: BulkPlantChanges = {
        spaceId:
          space === 'unchanged' ? undefined : space === 'none' ? null : space,
        addTags: isSupabaseConfigured
          ? normalizeTagNames(addTags.split(','))
          : [],
        removeTags: isSupabaseConfigured ? removeTags : [],
        waterIntervalDays: interval(waterMode, waterDays),
        fertilizerIntervalDays: interval(fertilizerMode, fertilizerDays),
      }
      validateBulkPlantChanges(changes)
      setError('')
      setConfirmed(changes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check your changes.')
    }
  }
  const save = async () => {
    if (saving.current || !confirmed) return
    saving.current = true
    setBusy(true)
    setError('')
    let complete = false
    try {
      const ids = result
        ? result.failed.map((item) => item.id)
        : plants.map((plant) => plant.id)
      const saved = await bulkPlantService.apply(
        ids,
        confirmed,
        (done, total) => setProgress(`${done} of ${total} plants processed`),
      )
      const combined = {
        ...saved,
        succeeded: [...(result?.succeeded ?? []), ...saved.succeeded],
      }
      setResult(combined)
      complete = !combined.failed.length
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      await refresh()
      saving.current = false
      setBusy(false)
    }
    if (complete) onSaved()
  }
  const close = () => {
    if (!saving.current) onClose()
  }
  const archived = plants.filter((plant) => plant.status === 'archived').length
  return createPortal(
    <DialogShell
      title={`Bulk edit ${plants.length} plants`}
      description="Only explicitly chosen changes will be applied."
      onClose={close}
    >
      <div className="space-y-5 p-5">
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer">
            Review selected plants ({plants.length})
          </summary>
          <ul className="max-h-40 overflow-y-auto">
            {plants.map((plant) => (
              <li key={plant.id}>
                {plant.nickname || plant.scientificName}
                {plant.status === 'archived' ? ' (Archived)' : ''}
              </li>
            ))}
          </ul>
        </details>
        {!!archived && (
          <p className="text-sm">
            Your explicit selection includes {archived} archived plants. Their
            status will not change.
          </p>
        )}
        {!confirmed ? (
          <>
            <label className="block text-sm font-semibold">
              Space/location
              <select
                className={field}
                value={space}
                onChange={(event) => setSpace(event.target.value)}
              >
                <option value="unchanged">Leave unchanged</option>
                <option value="none">No space (clear location)</option>
                {spaces
                  .filter((item) => !item.archivedAt)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset disabled={!isSupabaseConfigured} className="space-y-3">
              <legend className="font-semibold">Tags</legend>
              {!isSupabaseConfigured && (
                <p className="text-sm text-muted-foreground">
                  Plant tags are available in cloud collections.
                </p>
              )}
              <label className="block text-sm">
                Add tags (comma-separated)
                <input
                  className={field}
                  value={addTags}
                  onChange={(event) => setAddTags(event.target.value)}
                  placeholder="Orchid, Propagation"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Existing tags are kept. New tag names will be created.
              </p>
              {tags.isLoading && <p role="status">Loading existing tags…</p>}
              {tags.error && (
                <p role="alert">
                  {tags.error.message}{' '}
                  <Button variant="ghost" onClick={() => void tags.refetch()}>
                    Retry tags
                  </Button>
                </p>
              )}
              {!!tags.data?.length && (
                <fieldset>
                  <legend className="text-sm">Remove these tags only</legend>
                  <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                    {tags.data.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={removeTags.includes(tag.name)}
                          onChange={(event) =>
                            setRemoveTags((current) =>
                              event.target.checked
                                ? [...current, tag.name]
                                : current.filter((name) => name !== tag.name),
                            )
                          }
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </fieldset>
            {(
              [
                ['Watering', waterMode, setWaterMode, waterDays, setWaterDays],
                [
                  'Fertilizing',
                  fertilizerMode,
                  setFertilizerMode,
                  fertilizerDays,
                  setFertilizerDays,
                ],
              ] as const
            ).map(([label, mode, setMode, days, setDays]) => (
              <fieldset key={label}>
                <legend className="font-semibold">{label}</legend>
                <label className="block text-sm">
                  {label} interval
                  <select
                    className={field}
                    value={mode}
                    onChange={(event) =>
                      setMode(event.target.value as IntervalMode)
                    }
                  >
                    <option value="unchanged">Leave unchanged</option>
                    <option value="set">Set interval</option>
                    <option value="disabled">Disable routine</option>
                  </select>
                </label>
                {mode === 'set' && (
                  <label className="mt-2 block text-sm">
                    {label} every (days)
                    <input
                      className={field}
                      type="number"
                      min="1"
                      max="3650"
                      step="1"
                      value={days}
                      onChange={(event) => setDays(event.target.value)}
                    />
                  </label>
                )}
              </fieldset>
            ))}
            <p className="text-sm text-muted-foreground">
              Care dates and notes are kept. Existing care-managed tasks follow
              changed intervals; disabling a routine archives its managed task.
              No new recurring tasks are enabled, and unrelated tasks are left
              alone.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button disabled={!plants.length} onClick={review}>
                Review changes
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold">
              Confirm changes to {plants.length} plants
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {confirmed.spaceId !== undefined && (
                <li>
                  Location:{' '}
                  {confirmed.spaceId === null
                    ? 'No space'
                    : spaces.find((item) => item.id === confirmed.spaceId)
                        ?.name}
                </li>
              )}
              {!!confirmed.addTags?.length && (
                <li>Add tags: {confirmed.addTags.join(', ')}</li>
              )}
              {!!confirmed.removeTags?.length && (
                <li>Remove tags: {confirmed.removeTags.join(', ')}</li>
              )}
              {confirmed.waterIntervalDays !== undefined && (
                <li>
                  Watering:{' '}
                  {confirmed.waterIntervalDays
                    ? `every ${confirmed.waterIntervalDays} days`
                    : 'disabled (managed task archived)'}
                </li>
              )}
              {confirmed.fertilizerIntervalDays !== undefined && (
                <li>
                  Fertilizing:{' '}
                  {confirmed.fertilizerIntervalDays
                    ? `every ${confirmed.fertilizerIntervalDays} days`
                    : 'disabled (managed task archived)'}
                </li>
              )}
            </ul>
            <p className="text-sm">
              Changes are saved plant by plant, not as one all-or-nothing batch.
              If a save fails, some changes may already be saved. Retry applies
              only to failed plants.
            </p>
            {result && (
              <div role="status">
                <p>
                  {result.succeeded.length} plants saved; {result.failed.length}{' '}
                  need attention.
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                  {result.failed.map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}:</strong> {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {busy && <p role="status">Saving… {progress}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={result ? close : () => setConfirmed(undefined)}
              >
                {result ? 'Close' : 'Back'}
              </Button>
              <Button
                disabled={busy || result?.failed.length === 0}
                onClick={() => void save()}
              >
                {busy
                  ? 'Saving…'
                  : result
                    ? 'Retry failed plants'
                    : `Apply to ${plants.length} plants`}
              </Button>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="break-words text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </DialogShell>,
    document.body,
  )
}

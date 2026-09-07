import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { Plant, Task } from '../../../models'
import { useCareMutation } from '../../../hooks/useOrchardData'
import {
  careNextDue,
  inputDate,
  type CareProfileInput,
} from '../../tasks/taskScheduling'

export function CareTab({
  plant,
  tasks = [],
}: {
  plant: Plant
  tasks?: Task[]
}) {
  const [editing, setEditing] = useState(false)
  const mutation = useCareMutation()
  const routine = (type: Task['type']) =>
    tasks.find((t) => t.careManaged && t.type === type && t.status === 'open')
  if (editing)
    return (
      <CareEditor
        plant={plant}
        waterTask={!!routine('water')}
        fertilizerTask={!!routine('fertilize')}
        waterAnchor={routine('water')?.createdAt}
        fertilizerAnchor={routine('fertilize')?.createdAt}
        onCancel={() => setEditing(false)}
        onSave={async (input) => {
          await mutation.mutateAsync({ id: plant.id, input })
          setEditing(false)
        }}
      />
    )
  return (
    <Card
      title="Care profile"
      description="Your routine and next care dates."
      action={
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit care
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(['water', 'fertilize'] as const).map((type) => {
          const days =
            type === 'water'
              ? plant.waterIntervalDays
              : plant.fertilizerIntervalDays
          const last =
            type === 'water' ? plant.lastWateredAt : plant.lastFertilizedAt
          const task = routine(type)
          const next = task?.dueAt ?? careNextDue(last, days)
          return (
            <div
              key={type}
              className="rounded-xl border border-border bg-background p-4"
            >
              <h3 className="font-semibold">
                {type === 'water' ? 'Watering' : 'Fertilizing'}
              </h3>
              <p className="mt-1 text-sm">
                {days ? 'Every ' + days + ' days' : 'Disabled'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Last completed: {last?.toLocaleDateString() ?? 'Not set'}
              </p>
              <p className="text-sm">
                Next due:{' '}
                {next?.toLocaleDateString() ??
                  (days
                    ? 'Set a last completed date or create a task'
                    : 'Not scheduled')}
              </p>
              {task && (
                <p className="mt-2 text-xs text-accent">
                  Recurring task enabled
                </p>
              )}
            </div>
          )
        })}
        <p className="p-3 text-sm">Mounted: {plant.mounted ? 'Yes' : 'No'}</p>
        <p className="p-3 text-sm">
          Moss pole: {plant.mossPole ? 'Yes' : 'No'}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <h3 className="text-sm font-semibold">Care notes</h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">
          {plant.careNotes || 'No care notes yet.'}
        </p>
      </div>
    </Card>
  )
}

function CareEditor({
  plant,
  waterTask,
  fertilizerTask,
  waterAnchor,
  fertilizerAnchor,
  onCancel,
  onSave,
}: {
  plant: Plant
  waterTask: boolean
  fertilizerTask: boolean
  waterAnchor?: Date
  fertilizerAnchor?: Date
  onCancel: () => void
  onSave: (input: CareProfileInput) => Promise<void>
}) {
  const [water, setWater] = useState(!!plant.waterIntervalDays)
  const [fertilizer, setFertilizer] = useState(!!plant.fertilizerIntervalDays)
  const [waterDays, setWaterDays] = useState(plant.waterIntervalDays || 7)
  const [fertilizerDays, setFertilizerDays] = useState(
    plant.fertilizerIntervalDays || 14,
  )
  const [lastWater, setLastWater] = useState(inputDate(plant.lastWateredAt))
  const [lastFertilizer, setLastFertilizer] = useState(
    inputDate(plant.lastFertilizedAt),
  )
  const [waterRecurring, setWaterRecurring] = useState(waterTask)
  const [fertilizerRecurring, setFertilizerRecurring] = useState(fertilizerTask)
  const [mounted, setMounted] = useState(!!plant.mounted)
  const [mossPole, setMossPole] = useState(!!plant.mossPole)
  const [notes, setNotes] = useState(plant.careNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const date = (value: string, original?: Date) =>
    value
      ? original && inputDate(original) === value
        ? original
        : new Date(value + 'T00:00:00')
      : undefined
  const field =
    'min-h-11 min-w-0 w-full rounded-xl border border-border bg-background px-3'
  const sections = [
    {
      name: 'Watering',
      action: 'Water',
      enabled: water,
      enable: setWater,
      days: waterDays,
      setDays: setWaterDays,
      last: lastWater,
      setLast: setLastWater,
      recurring: waterRecurring,
      setRecurring: setWaterRecurring,
      anchor: waterAnchor,
      original: plant.lastWateredAt,
    },
    {
      name: 'Fertilizing',
      action: 'Fertilize',
      enabled: fertilizer,
      enable: setFertilizer,
      days: fertilizerDays,
      setDays: setFertilizerDays,
      last: lastFertilizer,
      setLast: setLastFertilizer,
      recurring: fertilizerRecurring,
      setRecurring: setFertilizerRecurring,
      anchor: fertilizerAnchor,
      original: plant.lastFertilizedAt,
    },
  ]
  return (
    <Card title="Edit care">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (saving) return
          setSaving(true)
          setError(undefined)
          try {
            await onSave({
              waterIntervalDays: water ? waterDays : 0,
              fertilizerIntervalDays: fertilizer ? fertilizerDays : 0,
              lastWateredAt: date(lastWater, plant.lastWateredAt),
              lastFertilizedAt: date(lastFertilizer, plant.lastFertilizedAt),
              mounted,
              mossPole,
              careNotes: notes,
              waterTask: water && waterRecurring,
              fertilizerTask: fertilizer && fertilizerRecurring,
            })
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Could not save care.',
            )
          } finally {
            setSaving(false)
          }
        }}
      >
        <p className="text-sm text-text-secondary">
          Enabling a recurring task may reuse an existing single-plant routine.
          Care will then manage its schedule. Turning the routine off archives
          that task, including one you originally created; its history is kept.
          Unrelated and shared tasks are not changed.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <fieldset
              key={section.name}
              className="min-w-0 space-y-3 rounded-xl border border-border p-4"
            >
              <legend className="px-1 font-semibold">{section.name}</legend>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  className="size-5 accent-accent"
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => section.enable(e.target.checked)}
                />
                {section.name} enabled
              </label>
              {section.enabled && (
                <>
                  <label className="block text-sm">
                    {section.action} every (days)
                    <input
                      aria-label={section.action + ' every (days)'}
                      required
                      type="number"
                      min={1}
                      max={3650}
                      step={1}
                      className={field + ' mt-1'}
                      value={section.days}
                      onChange={(e) => section.setDays(Number(e.target.value))}
                    />
                  </label>
                  <label className="block text-sm">
                    Last{' '}
                    {section.name === 'Watering' ? 'watered' : 'fertilized'}{' '}
                    (optional)
                    <input
                      aria-label={
                        'Last ' + section.name.toLowerCase() + ' date'
                      }
                      type="date"
                      max={inputDate(new Date())}
                      className={field + ' mt-1'}
                      value={section.last}
                      onChange={(e) => section.setLast(e.target.value)}
                    />
                  </label>
                  <p className="text-sm">
                    Next due:{' '}
                    {careNextDue(
                      date(section.last, section.original) ??
                        (section.recurring
                          ? (section.anchor ?? new Date())
                          : undefined),
                      section.days,
                    )?.toLocaleDateString() ?? 'Set a last completed date'}
                  </p>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 shrink-0 accent-accent"
                      checked={section.recurring}
                      onChange={(e) => section.setRecurring(e.target.checked)}
                    />
                    Create recurring{' '}
                    {section.name === 'Watering' ? 'watering' : 'fertilizer'}{' '}
                    task
                  </label>
                </>
              )}
            </fieldset>
          ))}
          <label className="text-sm">
            Mounted
            <select
              className={field + ' mt-1'}
              value={String(mounted)}
              onChange={(e) => setMounted(e.target.value === 'true')}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <label className="text-sm">
            Moss pole
            <select
              className={field + ' mt-1'}
              value={String(mossPole)}
              onChange={(e) => setMossPole(e.target.value === 'true')}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Care notes
          <textarea
            rows={4}
            className={field + ' mt-1 py-3'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="break-words text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save care'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

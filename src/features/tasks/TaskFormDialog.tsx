import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'
import type { CreateInput } from '../../db/repositories'
import type {
  Plant,
  Space,
  Task,
  TaskPriority,
  TaskRecurrence,
  TaskType,
  MediaAsset,
} from '../../models'
import { PlantBatchSelector } from '../labels/PlantBatchSelector'
import { assignedPlantIds, taskTypes, inputDate } from './taskScheduling'
import type { PlantAssignmentTag } from './usePlantAssignmentTags'

export function TaskFormDialog({
  task,
  plants,
  spaces,
  media = [],
  plantTags = [],
  plantId,
  plantIds,
  error,
  onClose,
  onSave,
}: {
  task?: Task
  plants: Plant[]
  spaces: Space[]
  media?: MediaAsset[]
  plantTags?: PlantAssignmentTag[]
  plantId?: string
  plantIds?: string[]
  error?: string
  onClose: () => void
  onSave: (input: CreateInput<Task>) => Promise<void>
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [type, setType] = useState<TaskType>(task?.type ?? 'custom')
  const [due, setDue] = useState(inputDate(task?.dueAt))
  const [time, setTime] = useState(
    task?.dueAt && (task.dueAt.getHours() || task.dueAt.getMinutes())
      ? task.dueAt.toTimeString().slice(0, 5)
      : '',
  )
  const [selected, setSelected] = useState(
    new Set(
      task ? assignedPlantIds(task) : (plantIds ?? (plantId ? [plantId] : [])),
    ),
  )
  const [spaceId, setSpace] = useState(task?.spaceId ?? '')
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'normal',
  )
  const [description, setDescription] = useState(task?.description ?? '')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    task?.recurrence ?? 'none',
  )
  const [interval, setInterval] = useState(task?.recurrenceIntervalDays ?? 7)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const field =
    'mt-1.5 min-h-11 min-w-0 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (!title.trim()) {
      setSaveError('Enter a task name.')
      return
    }
    setSaving(true)
    setSaveError(undefined)
    try {
      await onSave({
        title: title.trim(),
        type,
        dueAt: due ? new Date(due + 'T' + (time || '00:00')) : undefined,
        plantIds: [...selected],
        plantId: selected.size === 1 ? [...selected][0] : undefined,
        spaceId: spaceId || undefined,
        priority,
        description: description.trim() || undefined,
        recurrence,
        recurrenceIntervalDays:
          recurrence === 'interval' ? interval : undefined,
        status: task?.status ?? 'open',
        completedAt: task?.completedAt,
        archivedAt: task?.archivedAt,
        recurrenceSourceId: task?.recurrenceSourceId,
      })
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Could not save task. Please retry.',
      )
    } finally {
      setSaving(false)
    }
  }
  return createPortal(
    <DialogShell
      title={task ? 'Edit task' : 'Add task'}
      description="Plan a task for one or more plants."
      onClose={() => {
        if (!saving) onClose()
      }}
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="grid min-w-0 gap-4 p-5 sm:grid-cols-2"
      >
        <label className="min-w-0 text-sm font-medium sm:col-span-2">
          Task name
          <input
            required
            autoFocus
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="min-w-0 text-sm font-medium">
          Task type
          <select
            className={field}
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
          >
            {Object.entries(taskTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium">
          Due date
          <input
            type="date"
            required={recurrence !== 'none'}
            className={field}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label className="min-w-0 text-sm font-medium">
          Time (optional)
          <input
            type="time"
            disabled={!due}
            className={field}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <label className="min-w-0 text-sm font-medium">
          Repeat
          <select
            className={field}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="interval">Every X days</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        {recurrence === 'interval' && (
          <label className="text-sm font-medium">
            Every X days
            <input
              type="number"
              required
              min={1}
              max={3650}
              step={1}
              className={field}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </label>
        )}
        <fieldset className="min-w-0 space-y-3 sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">
            Assigned plants ({selected.size})
          </legend>
          <PlantBatchSelector
            plants={plants}
            spaces={spaces}
            media={media}
            plantTags={plantTags}
            selected={selected}
            onChange={setSelected}
            additive
          />
          {selected.size > 0 && (
            <p className="break-words text-xs text-muted-foreground">
              {plants
                .filter((p) => selected.has(p.id))
                .map(
                  (p) =>
                    (p.nickname || p.scientificName) +
                    (p.status === 'archived' ? ' (archived)' : ''),
                )
                .join(', ')}
            </p>
          )}
        </fieldset>
        <label className="min-w-0 text-sm font-medium">
          Space (optional)
          <select
            className={field}
            value={spaceId}
            onChange={(e) => setSpace(e.target.value)}
          >
            <option value="">None</option>
            {spaces
              .filter((s) => !s.archivedAt)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium">
          Priority
          <select
            className={field}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {['low', 'normal', 'high', 'urgent'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm font-medium sm:col-span-2">
          Notes
          <textarea
            rows={3}
            className={field + ' py-3'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {(saveError || error) && (
          <p
            role="alert"
            className="break-words text-sm text-red-600 sm:col-span-2"
          >
            {saveError || error}
          </p>
        )}
        <div className="sticky bottom-0 flex justify-end gap-2 bg-surface py-3 sm:col-span-2">
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save task'}
          </Button>
        </div>
      </form>
    </DialogShell>,
    document.body,
  )
}

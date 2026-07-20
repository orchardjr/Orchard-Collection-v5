import { useState, type FormEvent } from 'react'
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
} from '../../models'

function inputDate(date?: Date) {
  return date
    ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : ''
}
export function TaskFormDialog({
  task,
  plants,
  spaces,
  plantId,
  error,
  onClose,
  onSave,
}: {
  task?: Task
  plants: Plant[]
  spaces: Space[]
  plantId?: string
  error?: string
  onClose: () => void
  onSave: (input: CreateInput<Task>) => Promise<void>
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [type, setType] = useState<TaskType>(task?.type ?? 'custom')
  const [due, setDue] = useState(inputDate(task?.dueAt))
  const [selectedPlant, setPlant] = useState(task?.plantId ?? plantId ?? '')
  const [spaceId, setSpace] = useState(task?.spaceId ?? '')
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'normal',
  )
  const [description, setDescription] = useState(task?.description ?? '')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    task?.recurrence ?? 'none',
  )
  const [interval, setInterval] = useState(task?.recurrenceIntervalDays ?? 2)
  const field =
    'mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await onSave({
        title: title.trim(),
        type,
        dueAt: due ? new Date(due) : undefined,
        plantId: selectedPlant || undefined,
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
    } catch {
      // The parent mutation renders the repository error without closing the dialog.
    }
  }
  return (
    <DialogShell
      title={task ? 'Edit task' : 'Add task'}
      description="Plan a local collection operation."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => void submit(e)}
        className="grid gap-4 p-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium sm:col-span-2">
          Title
          <input
            required
            autoFocus
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Type
          <select
            className={field}
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
          >
            {[
              'water',
              'fertilize',
              'repot',
              'inspect',
              'photograph',
              'prune',
              'treat',
              'custom',
            ].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Due
          <input
            type="datetime-local"
            className={field}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Plant
          <select
            className={field}
            value={selectedPlant}
            onChange={(e) => setPlant(e.target.value)}
          >
            <option value="">None</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname || p.scientificName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Space
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
        <label className="text-sm font-medium">
          Priority
          <select
            className={field}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {['low', 'normal', 'high', 'urgent'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Recurrence
          <select
            className={field}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
          >
            {['none', 'daily', 'weekly', 'interval'].map((v) => (
              <option key={v}>{v === 'interval' ? 'Every N days' : v}</option>
            ))}
          </select>
        </label>
        {recurrence === 'interval' && (
          <label className="text-sm font-medium">
            Interval days
            <input
              type="number"
              min={1}
              className={field}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </label>
        )}
        <label className="text-sm font-medium sm:col-span-2">
          Description
          <textarea
            rows={3}
            className={`${field} h-auto py-3`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save task</Button>
        </div>
      </form>
    </DialogShell>
  )
}

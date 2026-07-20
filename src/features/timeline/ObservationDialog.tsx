import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'
import type { CreateInput } from '../../db/repositories'
import type { Plant, TimelineEvent, TimelineEventType } from '../../models'
function local(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}
export function ObservationDialog({
  event,
  plants,
  error,
  onClose,
  onSave,
}: {
  event?: TimelineEvent
  plants: Plant[]
  error?: string
  onClose: () => void
  onSave: (input: Omit<CreateInput<TimelineEvent>, 'isManual'>) => Promise<void>
}) {
  const [plantId, setPlant] = useState(event?.plantId ?? '')
  const [occurredAt, setDate] = useState(local(event?.occurredAt ?? new Date()))
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [eventType, setType] = useState<TimelineEventType>(
    event?.eventType ?? 'observation',
  )
  const field =
    'mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm'
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await onSave({
        plantId,
        occurredAt: new Date(occurredAt),
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        spaceId: plants.find((p) => p.id === plantId)?.spaceId,
        metadata: event?.metadata,
      })
    } catch {
      // The parent mutation renders the repository error without closing the dialog.
    }
  }
  return (
    <DialogShell
      title={event ? 'Edit observation' : 'Add observation'}
      description="Record a manual collection event."
      onClose={onClose}
    >
      <form
        className="grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => void submit(e)}
      >
        <label className="text-sm font-medium">
          Plant
          <select
            required
            className={field}
            value={plantId}
            onChange={(e) => setPlant(e.target.value)}
          >
            <option value="">Select plant</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Date and time
          <input
            required
            type="datetime-local"
            className={field}
            value={occurredAt}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Title
          <input
            required
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Category
          <select
            className={field}
            value={eventType}
            onChange={(e) => setType(e.target.value as TimelineEventType)}
          >
            {['observation', 'growth', 'care', 'note'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Notes
          <textarea
            rows={4}
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
          <Button type="submit">Save observation</Button>
        </div>
      </form>
    </DialogShell>
  )
}

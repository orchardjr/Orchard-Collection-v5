import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'
import type { CreateInput } from '../../db/repositories'
import type { Space, SpaceType } from '../../models'

export function SpaceFormDialog({
  space,
  spaces,
  error,
  onClose,
  onSave,
}: {
  space?: Space
  spaces: Space[]
  error?: string
  onClose: () => void
  onSave: (input: CreateInput<Space>) => Promise<void>
}) {
  const [name, setName] = useState(space?.name ?? '')
  const [description, setDescription] = useState(space?.description ?? '')
  const [type, setType] = useState<SpaceType>(space?.type ?? 'room')
  const [parentSpaceId, setParent] = useState(space?.parentSpaceId ?? '')
  const [lightNotes, setLight] = useState(space?.lightNotes ?? '')
  const [temperatureNotes, setTemperature] = useState(
    space?.temperatureNotes ?? '',
  )
  const [humidityNotes, setHumidity] = useState(space?.humidityNotes ?? '')
  const field =
    'mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15'
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        parentSpaceId: parentSpaceId || undefined,
        lightNotes: lightNotes.trim() || undefined,
        temperatureNotes: temperatureNotes.trim() || undefined,
        humidityNotes: humidityNotes.trim() || undefined,
        archivedAt: space?.archivedAt,
      })
    } catch {
      // The parent mutation renders the repository error without closing the dialog.
    }
  }
  return (
    <DialogShell
      title={space ? 'Edit space' : 'Add space'}
      description="Describe a physical collection location."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="grid gap-4 p-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium">
          Name
          <input
            required
            autoFocus
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Type
          <select
            className={field}
            value={type}
            onChange={(e) => setType(e.target.value as SpaceType)}
          >
            {[
              'room',
              'plant-room',
              'greenhouse',
              'cabinet',
              'shelf',
              'propagation',
              'outdoor',
              'other',
            ].map((value) => (
              <option key={value} value={value}>
                {value.replace('-', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Parent space
          <select
            className={field}
            value={parentSpaceId}
            onChange={(e) => setParent(e.target.value)}
          >
            <option value="">None</option>
            {spaces
              .filter((item) => !item.archivedAt && item.id !== space?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        {[
          ['Description', description, setDescription],
          ['Light notes', lightNotes, setLight],
          ['Temperature notes', temperatureNotes, setTemperature],
          ['Humidity notes', humidityNotes, setHumidity],
        ].map(([label, value, setter]) => (
          <label
            key={label as string}
            className="text-sm font-medium sm:col-span-2"
          >
            {label as string}
            <textarea
              className={`${field} h-auto py-3`}
              rows={2}
              value={value as string}
              onChange={(e) =>
                (setter as (value: string) => void)(e.target.value)
              }
            />
          </label>
        ))}
        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save space</Button>
        </div>
      </form>
    </DialogShell>
  )
}

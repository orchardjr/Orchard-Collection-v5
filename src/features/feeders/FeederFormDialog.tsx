import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'

export interface SimpleField {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea'
  required?: boolean
  allowNegative?: boolean
  options?: Array<[string, string]>
  value?: string | number
}
export type FeederFormValues = Record<string, string> & {
  name: string
  speciesId: string
  type: string
  status: string
  dateStarted: string
  binId: string
  location: string
  estimatedPopulation: string
  notes: string
  parentColonyId: string
  stage: string
  eggsMovedAt: string
  incubationDays: string
  quantity: string
  size: string
  unit: string
  storageBin: string
  dateAdded: string
  minimumStock: string
  delta: string
  confirm: string
  target: string
  action: string
  occurredAt: string
  material: string
  amount: string
  temperature: string
  humidity: string
  mortality: string
  observations: string
  userName: string
  destination: string
  inventoryId: string
  animalId: string
  quantityOffered: string
  quantityEaten: string
  supplements: string
}
export function FeederFormDialog({
  title,
  fields,
  error,
  onClose,
  onSave,
}: {
  title: string
  fields: SimpleField[]
  error?: string
  onClose: () => void
  onSave: (values: FeederFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<FeederFormValues>(
    () =>
      Object.fromEntries(
        fields.map((field) => [field.name, String(field.value ?? '')]),
      ) as FeederFormValues,
  )
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onSave(values)
    } catch {
      /* parent displays error */
    } finally {
      setBusy(false)
    }
  }
  const inputClass =
    'mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-accent/30'
  return (
    <DialogShell
      title={title}
      description="Required fields are marked."
      onClose={onClose}
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="grid gap-4 p-5 sm:grid-cols-2"
      >
        {fields.map((field) => (
          <label key={field.name} className="text-sm font-medium">
            {field.label}
            {field.required ? ' *' : ''}
            {field.type === 'select' ? (
              <select
                required={field.required}
                className={inputClass}
                value={values[field.name]}
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.value })
                }
              >
                <option value="">Select…</option>
                {field.options?.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                className={`${inputClass} min-h-24 py-3`}
                value={values[field.name]}
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.value })
                }
              />
            ) : (
              <input
                required={field.required}
                type={field.type ?? 'text'}
                min={
                  field.type === 'number' && !field.allowNegative
                    ? 0
                    : undefined
                }
                className={inputClass}
                value={values[field.name]}
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.value })
                }
              />
            )}
          </label>
        ))}
        {error && (
          <p role="alert" className="sm:col-span-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 border-t border-border bg-surface/95 p-4 backdrop-blur sm:col-span-2 sm:justify-end">
          <Button
            className="flex-1 sm:flex-none"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button className="flex-1 sm:flex-none" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </DialogShell>
  )
}

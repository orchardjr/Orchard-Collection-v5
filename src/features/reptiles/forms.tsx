import { useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'
import type { Field } from './formFields'
export const fieldClass =
  'mt-1 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background p-3 text-sm'
export function Fields({
  fields,
  values,
  onChange,
}: {
  fields: Field[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <>
      {fields.map((f) => (
        <label key={f.key} className="block min-w-0 text-sm">
          {f.label}
          {f.options ? (
            <select
              required={f.required}
              className={fieldClass}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
            >
              <option value="">Choose…</option>
              {f.options.map((value) => (
                <option key={value} value={value}>
                  {f.optionLabels?.[value] ?? value}
                </option>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              maxLength={10000}
              rows={4}
              className={fieldClass}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          ) : (
            <input
              required={f.required}
              className={fieldClass}
              type={f.type ?? 'text'}
              min={f.min}
              max={f.max}
              step={f.type === 'number' ? 'any' : undefined}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          )}
        </label>
      ))}
    </>
  )
}
export function RecordDialog({
  title,
  fields,
  initial = {},
  children,
  onClose,
  onSave,
}: {
  title: string
  fields: Field[]
  initial?: Record<string, string>
  children?: ReactNode
  onClose: () => void
  onSave: (values: Record<string, string>) => Promise<unknown>
}) {
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <DialogShell
      title={title}
      description="Only your signed-in account can access these records."
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className="space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault()
          if (busy) return
          setBusy(true)
          setError('')
          try {
            await onSave(values)
            onClose()
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Could not save this record.',
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Fields
            fields={fields}
            values={values}
            onChange={(key, value) => setValues({ ...values, [key]: value })}
          />
        </fieldset>
        {children}
        {error && (
          <p role="alert" className="break-words text-sm">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </DialogShell>
  )
}

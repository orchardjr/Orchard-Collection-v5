import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState, type FormEvent } from 'react'

import type { CreateInput } from '../../db/repositories'
import type { Plant, PlantStatus } from '../../models'
import { Button } from '../../components/ui/Button'

interface PlantFormDialogProps {
  plant?: Plant
  saving: boolean
  errorMessage?: string
  onClose: () => void
  onSave: (input: CreateInput<Plant>) => Promise<void>
}

function dateInputValue(date?: Date) {
  return date ? date.toISOString().slice(0, 10) : ''
}

export function PlantFormDialog({
  errorMessage,
  onClose,
  onSave,
  plant,
  saving,
}: PlantFormDialogProps) {
  const [nickname, setNickname] = useState(plant?.nickname ?? '')
  const [scientificName, setScientificName] = useState(
    plant?.scientificName ?? '',
  )
  const [commonName, setCommonName] = useState(plant?.commonName ?? '')
  const [cultivar, setCultivar] = useState(plant?.cultivar ?? '')
  const [vendor, setVendor] = useState(plant?.vendor ?? '')
  const [purchaseDate, setPurchaseDate] = useState(
    dateInputValue(plant?.purchaseDate),
  )
  const [notes, setNotes] = useState(plant?.notes ?? '')
  const [favorite, setFavorite] = useState(plant?.favorite ?? false)
  const [status, setStatus] = useState<PlantStatus>(plant?.status ?? 'active')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!scientificName.trim()) {
      setValidationError('Scientific name is required.')
      return
    }

    try {
      await onSave({
        nickname: nickname.trim(),
        scientificName: scientificName.trim(),
        commonName: commonName.trim() || undefined,
        cultivar: cultivar.trim() || undefined,
        vendor: vendor.trim() || undefined,
        purchaseDate: purchaseDate
          ? new Date(`${purchaseDate}T12:00:00`)
          : undefined,
        notes: notes.trim() || undefined,
        favorite,
        status,
        kind: plant?.kind ?? 'plant',
        heroImageUrl: plant?.heroImageUrl,
        spaceId: plant?.spaceId,
      })
    } catch {
      // The mutation exposes its error through errorMessage without closing the dialog.
    }
  }

  const fieldClass =
    'mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-overlay p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plant-dialog-title"
      aria-describedby="plant-dialog-description"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={() => !saving && onClose()}
        disabled={saving}
        aria-label="Close dialog"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-border/75 bg-surface shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4 sm:px-6">
          <div>
            <h2
              id="plant-dialog-title"
              className="font-display text-xl font-semibold text-foreground"
            >
              {plant ? 'Edit plant' : 'Add a plant'}
            </h2>
            <p
              id="plant-dialog-description"
              className="mt-1 text-xs text-muted-foreground"
            >
              Scientific name is the only required field.
            </p>
          </div>
          <Button
            variant="ghost"
            className="size-10 px-0"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={19} />
          </Button>
        </header>

        <form
          onSubmit={submit}
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="text-sm font-medium text-foreground">
            Nickname
            <input
              autoFocus
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Scientific name <span className="text-red-600">*</span>
            <input
              required
              value={scientificName}
              onChange={(event) => setScientificName(event.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(validationError)}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Common name
            <input
              value={commonName}
              onChange={(event) => setCommonName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Cultivar
            <input
              value={cultivar}
              onChange={(event) => setCultivar(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Vendor
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Purchase date
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as PlantStatus)}
              className={fieldClass}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(event) => setFavorite(event.target.checked)}
              className="size-4 accent-accent"
            />
            Mark as favorite
          </label>
          <label className="text-sm font-medium text-foreground sm:col-span-2">
            Notes
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${fieldClass} h-auto py-3`}
            />
          </label>

          {(validationError || errorMessage) && (
            <p
              id="plant-dialog-error"
              className="text-sm text-red-600 sm:col-span-2"
              role="alert"
            >
              {validationError || errorMessage}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-5 sm:col-span-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : plant ? 'Save changes' : 'Add plant'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

import { useState, type FormEvent } from 'react'

import { Button } from '../../components/ui/Button'
import { DialogShell } from '../../components/ui/DialogShell'

interface AssignNfcTagDialogProps {
  plantName: string
  pending: boolean
  error?: string
  onClose: () => void
  onAssign: (input: {
    nickname?: string
    notes?: string
    uid?: string
  }) => Promise<void>
}

const inputClass =
  'mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20'

export function AssignNfcTagDialog({
  error,
  onAssign,
  onClose,
  pending,
  plantName,
}: AssignNfcTagDialogProps) {
  const [nickname, setNickname] = useState(`${plantName} NFC tag`)
  const [notes, setNotes] = useState('')
  const [uid, setUid] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await onAssign({
        nickname: nickname.trim() || undefined,
        notes: notes.trim() || undefined,
        uid: uid.trim() || undefined,
      })
    } catch {
      // The mutation error is rendered by the dialog.
    }
  }

  return (
    <DialogShell
      title="Assign NFC Tag"
      description="Create a permanent public link for this plant. Hardware writing is not included in Phase 1."
      onClose={onClose}
    >
      <form className="space-y-5 p-5 sm:p-7" onSubmit={submit}>
        <label className="block text-sm font-semibold">
          Nickname
          <input
            className={inputClass}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            autoFocus
          />
        </label>
        <label className="block text-sm font-semibold">
          Tag UID{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
          <input
            className={inputClass}
            value={uid}
            onChange={(event) => setUid(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>
        <label className="block text-sm font-semibold">
          Notes{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Assigning…' : 'Assign NFC Tag'}
          </Button>
        </div>
      </form>
    </DialogShell>
  )
}

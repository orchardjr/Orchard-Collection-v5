import { useEffect, useRef, useState } from 'react'

import { Card } from '../../../components/ui/Card'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface NotesTabProps {
  notes: string
  onSave: (notes: string) => Promise<void>
}

export function NotesTab({ notes: initialNotes, onSave }: NotesTabProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const lastSaved = useRef(initialNotes)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (initialNotes !== lastSaved.current) {
      lastSaved.current = initialNotes
      setNotes(initialNotes)
      setStatus('idle')
    }
  }, [initialNotes])

  useEffect(() => {
    if (notes === lastSaved.current) return
    setStatus('idle')
    const timer = window.setTimeout(async () => {
      setStatus('saving')
      try {
        await onSaveRef.current(notes)
        lastSaved.current = notes
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, 2_000)
    return () => window.clearTimeout(timer)
  }, [notes])

  const statusText: Record<SaveStatus, string> = {
    idle: 'Changes save automatically',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Could not save. Edit to retry.',
  }

  return (
    <Card
      title="Notes"
      description="Capture observations, provenance, and context"
    >
      <label className="sr-only" htmlFor="plant-notes">
        Plant notes
      </label>
      <textarea
        id="plant-notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={12}
        placeholder="Add notes about this plant…"
        className="w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-7 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
      <p
        className={`mt-2 text-right text-xs ${status === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}
        role="status"
        aria-live="polite"
      >
        {statusText[status]}
      </p>
    </Card>
  )
}

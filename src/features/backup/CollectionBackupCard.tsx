import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import type { PlantStatusFilter } from '../plants/plantFilters'
import {
  backupDocument,
  downloadBackup,
  plantsCsv,
  readBackupTables,
  scopeBackup,
} from './collectionBackup'

export function CollectionBackupCard() {
  const [scope, setScope] = useState<PlantStatusFilter>('all')
  const [photos, setPhotos] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function run(format: 'csv' | 'json') {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('Reading collection records…')
    try {
      const result = await readBackupTables()
      const tables = scopeBackup(result.tables, scope)
      const content =
        format === 'csv'
          ? plantsCsv(tables)
          : await backupDocument(
              tables,
              result.local,
              scope,
              photos,
              setMessage,
            )
      downloadBackup(content, format)
      setMessage(
        `Download prepared: ${tables.plants.length} plants • ${new Date().toLocaleDateString()} • ${result.local ? 'local device' : 'cloud collection'}.`,
      )
    } catch (cause) {
      if (import.meta.env.DEV) console.error('Collection export failed', cause)
      setMessage('')
      setError(
        cause instanceof Error && !cause.message.includes('Supabase')
          ? cause.message
          : 'The collection could not be read. Please reconnect and retry. No backup was downloaded.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card
      title="Collection Backup & Export"
      className="mt-5 max-w-3xl"
      description="Download a copy without changing your collection."
    >
      <div className="space-y-4">
        <label className="block text-sm">
          Plants to include
          <select
            className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-background p-2"
            value={scope}
            disabled={busy}
            onChange={(e) => setScope(e.target.value as PlantStatusFilter)}
          >
            <option value="all">All plants (recommended for backups)</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={photos}
            disabled={busy}
            onChange={(e) => setPhotos(e.target.checked)}
          />
          Include photo files in JSON backup (up to 50 MB)
        </label>
        <p className="text-sm text-muted-foreground">
          CSV contains plant information for spreadsheets. JSON includes care
          profiles, tasks, shared assignments, timeline, tags, locations, NFC
          assignments and label templates. Photo files are optional. Keep this
          private: it contains your notes and NFC identifiers.
        </p>
        <p className="text-sm text-muted-foreground">
          This is not a full database backup and has no automatic restore.
          Feeder records and account settings are excluded. Avoid editing your
          collection while exporting; reads are not an atomic snapshot. Keep
          this page open until the download is prepared.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy}
            variant="secondary"
            onClick={() => void run('csv')}
          >
            Export CSV
          </Button>
          <Button disabled={busy} onClick={() => void run('json')}>
            Download JSON backup
          </Button>
        </div>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Card>
  )
}

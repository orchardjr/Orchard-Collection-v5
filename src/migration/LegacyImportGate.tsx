import { DatabaseBackup, Download, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type PropsWithChildren } from 'react'

import { useAuth } from '../auth/authContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import {
  deleteLegacyDatabase,
  getLegacyCounts,
  hasLegacyData,
  importLegacyData,
  isLegacyImportComplete,
  type ImportProgress,
  type LegacyCounts,
} from './legacyImport'

type GateState = 'checking' | 'offer' | 'importing' | 'success' | 'skipped'

const countLabels: Array<[keyof LegacyCounts, string]> = [
  ['plants', 'Plants'],
  ['spaces', 'Spaces'],
  ['tasks', 'Tasks'],
  ['timeline', 'Timeline entries'],
  ['photos', 'Photos'],
  ['feederRecords', 'Feeder records'],
]

export function LegacyImportGate({ children }: PropsWithChildren) {
  const { configured, user } = useAuth()
  const [state, setState] = useState<GateState>('checking')
  const [counts, setCounts] = useState<LegacyCounts>()
  const [progress, setProgress] = useState<ImportProgress>()
  const [errors, setErrors] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!configured || !user) return
    let active = true
    void Promise.all([getLegacyCounts(), isLegacyImportComplete()])
      .then(([localCounts, complete]) => {
        if (!active) return
        setCounts(localCounts)
        setState(hasLegacyData(localCounts) && !complete ? 'offer' : 'skipped')
      })
      .catch(() => {
        if (!active) return
        setMessage('Local data could not be inspected. You may retry safely.')
        setState('offer')
      })
    return () => {
      active = false
    }
  }, [configured, user])

  if (!configured || !user) return children
  if (state === 'skipped') return children

  const startImport = async () => {
    setState('importing')
    setErrors([])
    setMessage('')
    try {
      const result = await importLegacyData(setProgress)
      setErrors(result.errors)
      if (result.status === 'complete') setState('success')
      else {
        setMessage('Some records were not imported. Fix the errors and retry.')
        setState('offer')
      }
    } catch {
      setMessage('The import stopped safely. Check your connection and retry.')
      setState('offer')
    }
  }

  const removeLegacy = async () => {
    if (
      !window.confirm(
        'Delete this browser’s legacy Orchard database? Export or back up your data first. Cloud data will not be deleted.',
      )
    )
      return
    await deleteLegacyDatabase()
    setState('skipped')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <Card className="w-full max-w-2xl" aria-live="polite">
        {state === 'checking' ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : state === 'success' ? (
          <div className="space-y-6 text-center">
            <ShieldCheck
              className="mx-auto text-accent"
              size={48}
              aria-hidden="true"
            />
            <div>
              <h1 className="text-3xl font-bold">Import verified</h1>
              <p className="mt-2 text-muted-foreground">
                Your local collection is now available from your cloud account.
              </p>
            </div>
            <div className="rounded-xl bg-surface-muted p-4 text-sm">
              Keep the legacy database until you have checked another device.
              Export or back up important data before deleting it.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => setState('skipped')}>
                Continue to Orchard
              </Button>
              <Button variant="danger" onClick={() => void removeLegacy()}>
                Remove legacy data
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <DatabaseBackup
                className="mt-1 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-3xl font-bold">
                  Import existing local collection?
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Copy this browser’s Orchard data into your signed-in account.
                  The original local database will remain untouched.
                </p>
              </div>
            </div>

            {counts && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {countLabels.map(([key, label]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-border bg-surface-muted p-3"
                  >
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-2xl font-bold">{counts[key]}</dd>
                  </div>
                ))}
              </dl>
            )}

            {state === 'importing' && progress && (
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{progress.label}</span>
                  <span>
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <progress
                  className="h-3 w-full accent-accent"
                  value={progress.completed}
                  max={progress.total}
                />
              </div>
            )}

            {(message || errors.length > 0) && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"
              >
                {message}
                {errors.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {errors.slice(0, 8).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => void startImport()}
                disabled={state === 'importing'}
              >
                <Download size={18} aria-hidden="true" />
                {errors.length ? 'Retry import' : 'Start import'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setState('skipped')}
                disabled={state === 'importing'}
              >
                Not now
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  )
}

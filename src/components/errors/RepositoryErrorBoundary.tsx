import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

import { getLatestCollectionReadDiagnostic } from '../../data/collectionReadDiagnostics'
import {
  enableLocalCollectionMode,
  localCollectionUrl,
} from '../../data/localCollectionMode'
import { Button } from '../ui/Button'

interface State {
  error: Error | null
  recovering: boolean
  recoveryError?: string
}

export class RepositoryErrorBoundary extends Component<
  PropsWithChildren,
  State
> {
  override state: State = { error: null, recovering: false }

  static getDerivedStateFromError(error: Error): State {
    return { error, recovering: false }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Repository failure', error, info)
  }

  private useLocalCollection = async () => {
    this.setState({ recovering: true, recoveryError: undefined })
    try {
      await enableLocalCollectionMode()
      window.location.assign(localCollectionUrl(window.location.pathname))
    } catch (error) {
      this.setState({
        recovering: false,
        recoveryError:
          error instanceof Error
            ? error.message
            : 'The local collection could not be opened.',
      })
    }
  }

  override render() {
    if (this.state.error) {
      const diagnostic = getLatestCollectionReadDiagnostic()
      return (
        <div className="mx-auto max-w-2xl px-6 py-20 text-center" role="alert">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
            <AlertTriangle size={22} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
            We couldn’t open the collection
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your local data is still safe. You can open it without retrying the
            cloud connection.
          </p>
          {this.state.recoveryError && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">
              {this.state.recoveryError}
            </p>
          )}
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={() => void this.useLocalCollection()}
              disabled={this.state.recovering}
            >
              {this.state.recovering
                ? 'Opening local collection…'
                : 'Use local collection'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Retry cloud connection
            </Button>
          </div>
          {diagnostic && (
            <details className="mt-8 rounded-xl border border-border bg-surface p-4 text-left text-xs">
              <summary className="cursor-pointer font-semibold">
                Diagnostic details
              </summary>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 break-all">
                <dt>Repository</dt>
                <dd>{diagnostic.repository}</dd>
                <dt>Operation</dt>
                <dd>{diagnostic.operation}</dd>
                <dt>Query</dt>
                <dd>{diagnostic.query ?? 'unknown'}</dd>
                <dt>Category</dt>
                <dd>{diagnostic.category}</dd>
                <dt>Fallback attempted</dt>
                <dd>{String(diagnostic.fallbackAttempted)}</dd>
                <dt>Dexie opened</dt>
                <dd>{String(diagnostic.dexieOpened ?? false)}</dd>
                <dt>Local records</dt>
                <dd>{diagnostic.localRecordCount ?? 'unknown'}</dd>
                <dt>HTTP status</dt>
                <dd>{diagnostic.error?.status ?? 'unknown'}</dd>
                <dt>Cloud code</dt>
                <dd>{diagnostic.error?.code ?? 'unknown'}</dd>
              </dl>
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

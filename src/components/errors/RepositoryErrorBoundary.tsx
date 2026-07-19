import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

import { Button } from '../ui/Button'

interface State {
  error: Error | null
}

export class RepositoryErrorBoundary extends Component<
  PropsWithChildren,
  State
> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Repository failure', error, info)
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-6 py-20 text-center" role="alert">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
            <AlertTriangle size={22} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
            We couldn’t open the collection
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your local data is still safe. Reload the application to try again.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Reload application
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

import type { PropsWithChildren } from 'react'
import { AuthPage } from './AuthPage'
import { useAuth } from './authContext'
import {
  BACKEND_UNAVAILABLE_HINT,
  BACKEND_UNAVAILABLE_MESSAGE,
} from './authErrors'

export function AuthGate({ children }: PropsWithChildren) {
  const { backendUnavailable, configured, loading, session } = useAuth()

  if (!configured && import.meta.env.MODE !== 'test')
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <section className="max-w-lg rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
          <h1 className="font-display text-3xl font-semibold">
            Cloud setup required
          </h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to this
            environment, then redeploy Orchard Collection.
          </p>
        </section>
      </main>
    )
  if (loading)
    return (
      <main
        className="grid min-h-screen place-items-center bg-background"
        aria-label="Restoring your session"
      >
        <div className="w-72 space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" />
        </div>
      </main>
    )
  if (backendUnavailable)
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <section className="max-w-lg rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Orchard Collection
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold">
            Service temporarily offline
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            {BACKEND_UNAVAILABLE_MESSAGE}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {BACKEND_UNAVAILABLE_HINT}
          </p>
        </section>
      </main>
    )
  if (configured && !session) return <AuthPage />
  return children
}

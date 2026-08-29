import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './authContext'
import {
  isBackendUnavailable,
  reportAuthError,
  toSafeAuthError,
  withAuthTimeout,
} from './authErrors'

async function completeAuthOperation(
  operation: PromiseLike<{ error: unknown; data?: unknown }>,
  context: string,
) {
  try {
    const result = await withAuthTimeout(operation)
    if (result.error) throw result.error
  } catch (error) {
    reportAuthError(context, error)
    throw toSafeAuthError(error)
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [backendUnavailable, setBackendUnavailable] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void withAuthTimeout(supabase.auth.getSession())
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          reportAuthError('initial session check failed', error)
          setBackendUnavailable(isBackendUnavailable(error))
        } else {
          setBackendUnavailable(false)
          setSession(data.session)
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        reportAuthError('initial session check failed', error)
        setBackendUnavailable(isBackendUnavailable(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setBackendUnavailable(false)
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      backendUnavailable,
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      async signIn(email, password) {
        try {
          const { error } = await withAuthTimeout(
            supabase!.auth.signInWithPassword({ email, password }),
          )
          if (error) throw error
          setBackendUnavailable(false)
        } catch (error) {
          reportAuthError('sign in failed', error)
          const safeError = toSafeAuthError(error)
          if (isBackendUnavailable(safeError)) setBackendUnavailable(true)
          throw safeError
        }
      },
      async signUp(email, password) {
        await completeAuthOperation(
          supabase!.auth.signUp({ email, password }),
          'sign up failed',
        )
      },
      async signOut() {
        await completeAuthOperation(supabase!.auth.signOut(), 'sign out failed')
      },
      async requestPasswordReset(email) {
        await completeAuthOperation(
          supabase!.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset`,
          }),
          'password reset request failed',
        )
      },
      async updatePassword(password) {
        await completeAuthOperation(
          supabase!.auth.updateUser({ password }),
          'password update failed',
        )
      },
    }),
    [backendUnavailable, loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

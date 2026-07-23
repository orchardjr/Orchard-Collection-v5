import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './authContext'

function authMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('invalid login'))
    return 'Email or password is incorrect.'
  if (message.includes('already registered'))
    return 'An account already exists for this email.'
  if (message.includes('password'))
    return 'Use a password with at least six characters.'
  if (message.includes('rate')) return 'Please wait a moment and try again.'
  return 'Authentication could not be completed. Please try again.'
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (!error) setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      async signIn(email, password) {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw new Error(authMessage(error))
      },
      async signUp(email, password) {
        const { error } = await supabase!.auth.signUp({ email, password })
        if (error) throw new Error(authMessage(error))
      },
      async signOut() {
        const { error } = await supabase!.auth.signOut()
        if (error) throw new Error(authMessage(error))
      },
      async requestPasswordReset(email) {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
        if (error) throw new Error(authMessage(error))
      },
      async updatePassword(password) {
        const { error } = await supabase!.auth.updateUser({ password })
        if (error) throw new Error(authMessage(error))
      },
    }),
    [loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

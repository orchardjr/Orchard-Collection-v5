import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider.')
  return value
}

import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from './authContext'

type Mode = 'login' | 'signup' | 'reset' | 'new-password'

export function AuthPage() {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>(
    window.location.pathname === '/auth/reset' ? 'new-password' : 'login',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'login') await auth.signIn(email, password)
      if (mode === 'signup') {
        await auth.signUp(email, password)
        setMessage('Check your email to confirm your Orchard account.')
      }
      if (mode === 'reset') {
        await auth.requestPasswordReset(email)
        setMessage('Check your email for a password-reset link.')
      }
      if (mode === 'new-password') {
        await auth.updatePassword(password)
        window.history.replaceState({}, '', '/')
        setMessage('Your password has been updated.')
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const needsEmail = mode !== 'new-password'
  const needsPassword = mode !== 'reset'
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Orchard Collection
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          {mode === 'signup'
            ? 'Create your account'
            : mode === 'reset'
              ? 'Reset your password'
              : mode === 'new-password'
                ? 'Choose a new password'
                : 'Welcome back'}
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Sign in to keep your collection synchronized across your devices.
        </p>
        <form
          className="mt-7 space-y-4"
          onSubmit={(event) => void submit(event)}
        >
          {needsEmail && (
            <label className="block text-sm font-semibold">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4"
              />
            </label>
          )}
          {needsPassword && (
            <label className="block text-sm font-semibold">
              Password
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4"
              />
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-accent">{message}</p>}
          <Button className="w-full" type="submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'reset'
                  ? 'Send reset link'
                  : mode === 'new-password'
                    ? 'Update password'
                    : 'Sign in'}
          </Button>
        </form>
        {mode !== 'new-password' && (
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <Button
              variant="ghost"
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            >
              {mode === 'signup' ? 'Sign in instead' : 'Create account'}
            </Button>
            <Button variant="ghost" onClick={() => setMode('reset')}>
              Forgot password?
            </Button>
          </div>
        )}
      </Card>
    </main>
  )
}

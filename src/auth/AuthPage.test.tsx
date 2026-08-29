import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from './authContext'
import { AuthPage } from './AuthPage'
import {
  BACKEND_UNAVAILABLE_HINT,
  BACKEND_UNAVAILABLE_MESSAGE,
  BackendUnavailableError,
} from './authErrors'

function renderAuth(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    backendUnavailable: false,
    configured: true,
    loading: false,
    session: null,
    user: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(
    <AuthContext.Provider value={value}>
      <AuthPage />
    </AuthContext.Provider>,
  )
  return value
}

describe('authentication screen', () => {
  it('completes a normal successful login', async () => {
    const auth = renderAuth()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'grower@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'orchard-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() =>
      expect(auth.signIn).toHaveBeenCalledWith(
        'grower@example.com',
        'orchard-password',
      ),
    )
  })

  it('preserves the invalid-credentials message', async () => {
    renderAuth({
      signIn: vi
        .fn()
        .mockRejectedValue(new Error('Email or password is incorrect.')),
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'grower@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(
      await screen.findByText('Email or password is incorrect.'),
    ).toBeTruthy()
  })

  it('shows the safe backend-unavailable message and hint', async () => {
    renderAuth({
      signIn: vi.fn().mockRejectedValue(new BackendUnavailableError()),
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'grower@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'orchard-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(BACKEND_UNAVAILABLE_MESSAGE)).toBeTruthy()
    expect(screen.getByText(BACKEND_UNAVAILABLE_HINT)).toBeTruthy()
  })
})

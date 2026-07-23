import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from './authContext'
import { AuthPage } from './AuthPage'

function renderAuth(overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
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
  it('submits email and password login', async () => {
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

  it('shows safe authentication errors', async () => {
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
})

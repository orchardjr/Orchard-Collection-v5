import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthContextValue } from './authContext'
import { AuthGate } from './AuthGate'
import {
  BACKEND_UNAVAILABLE_HINT,
  BACKEND_UNAVAILABLE_MESSAGE,
} from './authErrors'

const unavailableAuth: AuthContextValue = {
  backendUnavailable: true,
  configured: true,
  loading: false,
  session: null,
  user: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}

describe('AuthGate', () => {
  it('shows a safe unavailable state when initial session bootstrap fails', () => {
    render(
      <AuthContext.Provider value={unavailableAuth}>
        <AuthGate>
          <p>Application content</p>
        </AuthGate>
      </AuthContext.Provider>,
    )

    expect(screen.getByText(BACKEND_UNAVAILABLE_MESSAGE)).toBeTruthy()
    expect(screen.getByText(BACKEND_UNAVAILABLE_HINT)).toBeTruthy()
    expect(screen.queryByText('Application content')).toBeNull()
  })
})

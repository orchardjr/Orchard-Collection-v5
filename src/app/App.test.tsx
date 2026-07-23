import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { App } from './App'
import { AuthContext, type AuthContextValue } from '../auth/authContext'

const localAuth: AuthContextValue = {
  configured: false,
  loading: false,
  session: null,
  user: null,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signOut: async () => undefined,
  requestPasswordReset: async () => undefined,
  updatePassword: async () => undefined,
}

describe('App', () => {
  it('renders the home route', async () => {
    const queryClient = new QueryClient()

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={localAuth}>
            <App />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Welcome back to Orchard Collection.',
      }),
    ).toBeTruthy()
  })
})

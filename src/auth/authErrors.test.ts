import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BACKEND_UNAVAILABLE_MESSAGE,
  BackendUnavailableError,
  isBackendUnavailable,
  toSafeAuthError,
  withAuthTimeout,
} from './authErrors'

afterEach(() => {
  vi.useRealTimers()
})

describe('authentication error classification', () => {
  it('keeps invalid credentials separate from backend outages', () => {
    const error = toSafeAuthError({
      status: 400,
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    })

    expect(error.message).toBe('Email or password is incorrect.')
    expect(error).not.toBeInstanceOf(BackendUnavailableError)
  })

  it.each([
    [{ status: 503, message: 'Service unavailable' }],
    [new TypeError('Failed to fetch')],
    [new DOMException('Authentication request timed out', 'TimeoutError')],
    [{ code: 'ECONNREFUSED', message: 'connect failed' }],
    [{ status: 522, message: 'Connection timed out' }],
  ])('recognizes a backend or network outage', (source) => {
    expect(isBackendUnavailable(source)).toBe(true)
    const error = toSafeAuthError(source)
    expect(error).toBeInstanceOf(BackendUnavailableError)
    expect(error.message).toBe(BACKEND_UNAVAILABLE_MESSAGE)
  })

  it('does not expose unknown Supabase details', () => {
    const error = toSafeAuthError({
      status: 400,
      message: 'secret internal URL https://example.supabase.co',
    })
    expect(error.message).toBe(
      'Authentication could not be completed. Please try again.',
    )
    expect(error.message).not.toContain('supabase.co')
  })

  it('clears its timeout when the authentication request settles', async () => {
    vi.useFakeTimers()
    await expect(withAuthTimeout(Promise.resolve('ok'))).resolves.toBe('ok')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('settles an unresolved authentication request at the timeout', async () => {
    vi.useFakeTimers()
    const request = withAuthTimeout(new Promise<never>(() => undefined), 100)
    const expectation = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
    })
    await vi.advanceTimersByTimeAsync(100)
    await expectation
    expect(vi.getTimerCount()).toBe(0)
  })
})

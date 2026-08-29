export const BACKEND_UNAVAILABLE_MESSAGE =
  'Orchard Collection is temporarily unavailable because the database service is offline. Your collection data is safe. Please try again shortly.'

export const BACKEND_UNAVAILABLE_HINT =
  'If this persists, the Supabase project may need to be resumed.'

interface ErrorDetails {
  code?: unknown
  message?: unknown
  name?: unknown
  status?: unknown
}

const unavailableStatuses = new Set([
  0, 408, 425, 500, 502, 503, 504, 520, 521, 522, 523, 524,
])

export class BackendUnavailableError extends Error {
  readonly backendUnavailable = true

  constructor(options?: ErrorOptions) {
    super(BACKEND_UNAVAILABLE_MESSAGE, options)
    this.name = 'BackendUnavailableError'
  }
}

function details(error: unknown): ErrorDetails {
  return typeof error === 'object' && error !== null
    ? (error as ErrorDetails)
    : {}
}

export function isBackendUnavailable(error: unknown) {
  if (error instanceof BackendUnavailableError) return true
  const value = details(error)
  const status =
    typeof value.status === 'number'
      ? value.status
      : Number.parseInt(String(value.status ?? ''), 10)
  if (unavailableStatuses.has(status)) return true

  const text =
    `${String(value.code ?? '')} ${String(value.name ?? '')} ${String(
      value.message ?? (error instanceof Error ? error.message : (error ?? '')),
    )}`.toLowerCase()

  return [
    'failed to fetch',
    'fetch failed',
    'networkerror',
    'network error',
    'network request failed',
    'load failed',
    'aborterror',
    'timed out',
    'timeout',
    'service unavailable',
    'temporarily unavailable',
    'connection refused',
    'connection reset',
    'econnrefused',
    'econnreset',
    'enotfound',
    'gateway timeout',
    'project is paused',
    'project paused',
  ].some((indicator) => text.includes(indicator))
}

export function reportAuthError(context: string, error: unknown) {
  if (import.meta.env.DEV) console.error(`[Orchard auth] ${context}`, error)
}

export function toSafeAuthError(error: unknown) {
  if (isBackendUnavailable(error))
    return new BackendUnavailableError({ cause: error })

  const message = String(details(error).message ?? '').toLowerCase()
  if (message.includes('invalid login'))
    return new Error('Email or password is incorrect.', { cause: error })
  if (message.includes('already registered'))
    return new Error('An account already exists for this email.', {
      cause: error,
    })
  if (message.includes('password'))
    return new Error('Use a password with at least six characters.', {
      cause: error,
    })
  if (message.includes('rate'))
    return new Error('Please wait a moment and try again.', { cause: error })
  return new Error('Authentication could not be completed. Please try again.', {
    cause: error,
  })
}

export function withAuthTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs = 12_000,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new DOMException('Authentication request timed out', 'TimeoutError'),
        ),
      timeoutMs,
    )
  })
  return Promise.race([Promise.resolve(operation), timeout]).finally(() =>
    clearTimeout(timer),
  )
}

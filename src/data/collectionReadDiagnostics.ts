export type CollectionReadCategory =
  | 'authorization'
  | 'network'
  | 'server'
  | 'schema'
  | 'programming'
  | 'unknown'
  | 'local-only'

export interface SafeCloudError {
  name?: string
  status?: number
  code?: string
  message?: string
  details?: string
  hint?: string
  cause?: SafeCloudError
}

export interface CollectionReadDiagnostic {
  repository: string
  operation: string
  query?: string
  category: CollectionReadCategory
  error?: SafeCloudError
  fallbackAttempted: boolean
  dexieOpened?: boolean
  localRecordCount?: number
  fallbackError?: SafeCloudError
  timestamp: string
}

let latestDiagnostic: CollectionReadDiagnostic | undefined

function text(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function status(value: unknown) {
  if (value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function safeCloudError(
  error: unknown,
  depth = 0,
  seen = new Set<unknown>(),
): SafeCloudError | undefined {
  if (!error || typeof error !== 'object' || seen.has(error) || depth > 4)
    return undefined
  seen.add(error)
  const candidate = error as Record<string, unknown>
  return {
    name: text(candidate.name),
    status: status(candidate.status ?? candidate.statusCode),
    code: text(candidate.code),
    message: text(candidate.message),
    details: text(candidate.details),
    hint: text(candidate.hint),
    cause: safeCloudError(candidate.cause, depth + 1, seen),
  }
}

function errorChain(error?: SafeCloudError) {
  const chain: SafeCloudError[] = []
  let current = error
  while (current) {
    chain.push(current)
    current = current.cause
  }
  return chain
}

export function classifyCloudRead(error?: SafeCloudError) {
  const chain = errorChain(error)
  if (
    chain.some(
      ({ status: httpStatus, code }) =>
        httpStatus === 401 ||
        httpStatus === 403 ||
        code?.toUpperCase() === '42501' ||
        code?.toUpperCase() === 'PGRST301',
    )
  )
    return 'authorization' as const
  if (
    chain.some(
      ({ name, message = '' }) =>
        name === 'TypeError' ||
        /failed to fetch|network|load failed/i.test(message),
    )
  )
    return 'network' as const
  if (chain.some(({ status: httpStatus }) => (httpStatus ?? 0) >= 500))
    return 'server' as const
  if (
    chain.some(
      ({ code = '', message = '' }) =>
        /^PGRST2/i.test(code) ||
        /schema cache|could not find the table|column .* does not exist/i.test(
          message,
        ),
    )
  )
    return 'schema' as const
  if (
    chain.some(
      ({ status: httpStatus }) =>
        httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500,
    )
  )
    return 'programming' as const
  return 'unknown' as const
}

export function reportCollectionRead(
  diagnostic: CollectionReadDiagnostic,
  log = console.error,
) {
  latestDiagnostic = diagnostic
  log('orchard.collection-read', diagnostic)
}

export function getLatestCollectionReadDiagnostic() {
  return latestDiagnostic
}

export function clearCollectionReadDiagnostic() {
  latestDiagnostic = undefined
}

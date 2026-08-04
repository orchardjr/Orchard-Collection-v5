interface ErrorRecord {
  code?: unknown
  status?: unknown
  statusCode?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
  error?: unknown
  cause?: unknown
}

function record(value: unknown): ErrorRecord | undefined {
  return value && typeof value === 'object' ? (value as ErrorRecord) : undefined
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export interface SupabaseErrorDetails {
  code?: string
  status?: string
  message: string
  details?: string
  hint?: string
}

export function getSupabaseErrorDetails(error: unknown): SupabaseErrorDetails {
  const outer = record(error)
  const cause = record(outer?.cause)
  const source = cause ?? outer
  return {
    code: text(source?.code) ?? text(source?.error),
    status:
      text(source?.statusCode) ??
      text(source?.status) ??
      (typeof source?.statusCode === 'number'
        ? String(source.statusCode)
        : typeof source?.status === 'number'
          ? String(source.status)
          : undefined),
    message:
      text(source?.message) ??
      text(outer?.message) ??
      (typeof error === 'string' ? error : 'Unknown Supabase error.'),
    details: text(source?.details),
    hint: text(source?.hint),
  }
}

export function formatSupabaseErrorDetails(error: unknown) {
  const details = getSupabaseErrorDetails(error)
  return [
    details.code ? `Code: ${details.code}.` : undefined,
    details.status ? `Status: ${details.status}.` : undefined,
    `Message: ${details.message}`,
    details.details ? `Details: ${details.details}` : undefined,
    details.hint ? `Hint: ${details.hint}` : undefined,
  ]
    .filter(Boolean)
    .join(' ')
}

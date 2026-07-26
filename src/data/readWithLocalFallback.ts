interface CloudReadError {
  status?: number
  statusCode?: number | string
  code?: string
  message?: string
  cause?: unknown
}

function errorChain(error: unknown) {
  const chain: CloudReadError[] = []
  let current = error
  const seen = new Set<unknown>()
  while (
    current &&
    typeof current === 'object' &&
    !seen.has(current) &&
    chain.length < 5
  ) {
    seen.add(current)
    const candidate = current as CloudReadError
    chain.push(candidate)
    current = candidate.cause
  }
  return chain
}

export function canUseLocalReadFallback(error: unknown) {
  if (error instanceof TypeError) return true
  return errorChain(error).some((candidate) => {
    const status = Number(candidate.status ?? candidate.statusCode)
    const code = candidate.code?.toUpperCase()
    const message = candidate.message?.toLowerCase() ?? ''
    return (
      status === 401 ||
      status === 403 ||
      (status !== undefined && status >= 500) ||
      code === '42501' ||
      code === 'PGRST301' ||
      message.includes('forbidden') ||
      message.includes('permission denied') ||
      message.includes('failed to fetch') ||
      message.includes('network')
    )
  })
}

export async function readWithLocalFallback<T>(
  cloudRead: () => Promise<T>,
  localRead: () => Promise<T>,
  cloudEnabled: boolean,
) {
  const readLocal = async () => {
    if (!db.isOpen()) await db.open()
    return localRead()
  }
  if (!cloudEnabled) return readLocal()
  try {
    return await cloudRead()
  } catch (error) {
    if (!canUseLocalReadFallback(error)) throw error
    if (import.meta.env.DEV)
      console.warn('Cloud read unavailable; using local Orchard data.', error)
    return readLocal()
  }
}
import { db } from '../db/database'

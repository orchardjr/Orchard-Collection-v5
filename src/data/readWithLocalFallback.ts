import { db } from '../db/database'
import {
  classifyCloudRead,
  reportCollectionRead,
  safeCloudError,
  type CollectionReadDiagnostic,
} from './collectionReadDiagnostics'
import { isLocalCollectionMode } from './localCollectionMode'

export interface CollectionReadContext {
  repository: string
  operation: string
  query?: string
}

function recordCount(value: unknown) {
  return Array.isArray(value) ? value.length : value === undefined ? 0 : 1
}

export function canUseLocalReadFallback(error: unknown) {
  const category = classifyCloudRead(safeCloudError(error))
  return (
    category === 'authorization' ||
    category === 'network' ||
    category === 'server'
  )
}

export async function readWithLocalFallback<T>(
  cloudRead: () => Promise<T>,
  localRead: () => Promise<T>,
  cloudEnabled: boolean,
  context: CollectionReadContext = {
    repository: 'unknown',
    operation: 'read',
  },
) {
  const readLocal = async (
    diagnostic: CollectionReadDiagnostic,
    log: typeof console.error = console.error,
  ) => {
    diagnostic.fallbackAttempted = true
    try {
      if (!db.isOpen()) await db.open()
      diagnostic.dexieOpened = db.isOpen()
      const records = await localRead()
      diagnostic.localRecordCount = recordCount(records)
      reportCollectionRead(diagnostic, log)
      return records
    } catch (error) {
      diagnostic.dexieOpened = db.isOpen()
      diagnostic.fallbackError = safeCloudError(error)
      reportCollectionRead(diagnostic)
      throw error
    }
  }

  if (!cloudEnabled) {
    if (!db.isOpen()) await db.open()
    return localRead()
  }
  if (isLocalCollectionMode())
    return readLocal(
      {
        ...context,
        category: 'local-only',
        fallbackAttempted: false,
        timestamp: new Date().toISOString(),
      },
      console.info,
    )

  try {
    return await cloudRead()
  } catch (error) {
    const captured = safeCloudError(error)
    const category = classifyCloudRead(captured)
    const diagnostic: CollectionReadDiagnostic = {
      ...context,
      category,
      error: captured,
      fallbackAttempted: false,
      timestamp: new Date().toISOString(),
    }
    if (!canUseLocalReadFallback(error)) {
      reportCollectionRead(diagnostic)
      throw error
    }
    return readLocal(diagnostic)
  }
}

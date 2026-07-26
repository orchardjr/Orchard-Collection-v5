import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  classifyCloudRead,
  clearCollectionReadDiagnostic,
  getLatestCollectionReadDiagnostic,
  reportCollectionRead,
  safeCloudError,
} from './collectionReadDiagnostics'

describe('collection read diagnostics', () => {
  beforeEach(clearCollectionReadDiagnostic)

  it('captures the complete nested Supabase error before classification', () => {
    const captured = safeCloudError(
      new Error('Cloud read failed.', {
        cause: {
          status: 403,
          code: '42501',
          message: 'permission denied for table plants',
          details: 'RLS rejected the request',
          hint: 'Check the user policy',
        },
      }),
    )

    expect(captured).toMatchObject({
      message: 'Cloud read failed.',
      cause: {
        status: 403,
        code: '42501',
        message: 'permission denied for table plants',
        details: 'RLS rejected the request',
        hint: 'Check the user policy',
      },
    })
    expect(classifyCloudRead(captured)).toBe('authorization')
  })

  it('keeps missing-table responses classified as schema errors', () => {
    const error = safeCloudError({
      status: 404,
      code: 'PGRST205',
      message: "Could not find the table 'public.organizations'",
      details: null,
      hint: "Perhaps you meant the table 'public.inventory_transactions'",
    })
    expect(classifyCloudRead(error)).toBe('schema')
  })

  it('stores structured production-safe boundary diagnostics', () => {
    const log = vi.fn()
    reportCollectionRead(
      {
        repository: 'plants',
        operation: 'getAll',
        category: 'authorization',
        fallbackAttempted: true,
        dexieOpened: true,
        localRecordCount: 6,
        timestamp: '2026-07-26T00:00:00.000Z',
      },
      log,
    )
    expect(getLatestCollectionReadDiagnostic()).toMatchObject({
      repository: 'plants',
      operation: 'getAll',
      localRecordCount: 6,
    })
    expect(log).toHaveBeenCalledWith(
      'orchard.collection-read',
      expect.any(Object),
    )
  })
})

import { describe, expect, it, vi } from 'vitest'

import {
  assertOnline,
  fromSupabaseRow,
  repositoryError,
  toSupabaseRow,
} from './SupabaseRepository'

describe('Supabase repository mapping', () => {
  it('maps database fields and dates into strict domain records', () => {
    const mapped = fromSupabaseRow<{
      plantId: string
      occurredAt: Date
      notes?: string
    }>({
      plant_id: 'plant-1',
      occurred_at: '2026-07-23T10:00:00.000Z',
      notes: null,
    })
    expect(mapped.plantId).toBe('plant-1')
    expect(mapped.occurredAt).toEqual(new Date('2026-07-23T10:00:00.000Z'))
    expect(mapped.notes).toBeUndefined()
  })

  it('never sends browser-only blobs or signed URLs to PostgreSQL', () => {
    const row = toSupabaseRow({
      plantId: 'plant-1',
      uploadedAt: new Date('2026-07-23T10:00:00.000Z'),
      blob: new Blob(['photo']),
      thumbnailBlob: new Blob(['thumb']),
      signedUrl: 'temporary',
      thumbnailUrl: 'temporary-thumb',
    })
    expect(row).toEqual({
      plant_id: 'plant-1',
      uploaded_at: '2026-07-23T10:00:00.000Z',
    })
  })
})

describe('offline cloud writes', () => {
  it('fails visibly before attempting a mutation', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    expect(() => assertOnline()).toThrow(/offline/i)
    vi.restoreAllMocks()
  })
})

describe('cloud repository diagnostics', () => {
  it('includes Supabase diagnostics in development errors', () => {
    const error = repositoryError('write', {
      code: '22P02',
      message: 'invalid input syntax for type uuid: "feeder-species-1"',
    })
    expect(error.message).toContain('[22P02]')
    expect(error.message).toContain('invalid input syntax for type uuid')
  })

  it('keeps production errors user-friendly', () => {
    const error = repositoryError(
      'write',
      {
        code: '22P02',
        message: 'raw database error',
      },
      false,
    )
    expect(error.message).toBe(
      'Cloud write failed. Check your connection and retry.',
    )
  })
})

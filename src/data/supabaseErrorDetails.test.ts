import { describe, expect, it } from 'vitest'

import {
  formatSupabaseErrorDetails,
  getSupabaseErrorDetails,
} from './supabaseErrorDetails'

describe('Supabase error details', () => {
  it('preserves PostgREST diagnostics for the UI', () => {
    const error = {
      code: '23503',
      message: 'insert or update violates foreign key constraint',
      details: 'Key (user_id, plant_id) is not present in table plants.',
      hint: 'Use the UUID returned by the plants insert.',
    }

    expect(getSupabaseErrorDetails(error)).toEqual(error)
    expect(formatSupabaseErrorDetails(error)).toContain('Code: 23503')
    expect(formatSupabaseErrorDetails(error)).toContain(
      'Details: Key (user_id, plant_id)',
    )
    expect(formatSupabaseErrorDetails(error)).toContain(
      'Hint: Use the UUID returned by the plants insert.',
    )
  })

  it('unwraps errors that preserve the Supabase response as their cause', () => {
    const error = new Error('Friendly wrapper', {
      cause: { statusCode: '403', error: 'Unauthorized', message: 'Denied' },
    })

    expect(getSupabaseErrorDetails(error)).toMatchObject({
      code: 'Unauthorized',
      status: '403',
      message: 'Denied',
    })
  })
})

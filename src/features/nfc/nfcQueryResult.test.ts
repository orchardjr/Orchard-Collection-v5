import { describe, expect, it } from 'vitest'

import { normalizeNfcTagQueryResult } from './nfcQueryResult'

describe('normalizeNfcTagQueryResult', () => {
  it('returns null when no NFC tag is assigned', () => {
    expect(normalizeNfcTagQueryResult(undefined)).toBeNull()
  })
})

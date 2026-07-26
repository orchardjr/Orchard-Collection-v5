import { describe, expect, it } from 'vitest'

import { isUuid } from './isUuid'

describe('isUuid', () => {
  it('accepts cloud UUID identifiers', () => {
    expect(isUuid('8f56e5db-5e89-4e5f-a8d5-6c5695a2af52')).toBe(true)
  })

  it('rejects local seed identifiers', () => {
    expect(isUuid('plant-monstera-albo')).toBe(false)
  })
})

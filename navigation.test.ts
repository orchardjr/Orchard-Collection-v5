import { describe, expect, it } from 'vitest'

import { navigationItems } from './navigation'

describe('primary navigation', () => {
  it('keeps the collection scanner visible as a primary entry point', () => {
    expect(navigationItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Scan', path: '/scan' }),
      ]),
    )
    expect(navigationItems.slice(0, 4).map(({ path }) => path)).toContain(
      '/scan',
    )
  })
})

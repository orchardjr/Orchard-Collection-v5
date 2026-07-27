import { describe, expect, it } from 'vitest'

import { resolveScanRoute } from './resolveScanRoute'

const origin = 'https://app.orchardcollection.ca'

describe('resolveScanRoute', () => {
  it.each([
    ['/collection/plant-1', '/collection/plant-1'],
    [`${origin}/collection/plant-1`, '/collection/plant-1'],
    [`${origin}/nfc/token-1`, '/nfc/token-1'],
    [`${origin}/feeders/colonies/colony-1`, '/feeders/colonies/colony-1'],
  ])('resolves Orchard scan destination %s', (value, expected) => {
    expect(resolveScanRoute(value, origin)).toBe(expected)
  })

  it('rejects external and unsupported URLs', () => {
    expect(resolveScanRoute('https://example.com/collection/1', origin)).toBe(
      undefined,
    )
    expect(resolveScanRoute(`${origin}/settings`, origin)).toBe(undefined)
  })
})

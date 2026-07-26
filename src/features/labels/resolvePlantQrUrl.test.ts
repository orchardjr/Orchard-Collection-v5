import { describe, expect, it } from 'vitest'

import type { Plant } from '../../models'
import { resolvePlantQrUrl } from './resolvePlantQrUrl'

const plant = {
  id: 'plant-hoya-ets-10',
  nickname: 'Silver Trail',
} as Plant

describe('resolvePlantQrUrl', () => {
  it('prefers a valid permanent NFC URL', () => {
    expect(
      resolvePlantQrUrl(plant, {
        publicToken: '710a0926-0123-4567-89ab-14ae3cbdf123',
      }),
    ).toBe(
      'https://app.orchardcollection.ca/nfc/710a0926-0123-4567-89ab-14ae3cbdf123',
    )
  })

  it('uses the stable plant URL without NFC assignment', () => {
    expect(resolvePlantQrUrl(plant)).toBe(
      'https://app.orchardcollection.ca/collection/plant-hoya-ets-10',
    )
  })
})

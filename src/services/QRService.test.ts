import { describe, expect, it } from 'vitest'

import { QRService } from './QRService'

describe('QRService', () => {
  it('generates the canonical public NFC URL and QR output', async () => {
    const service = new QRService()
    const token = '710a0926-0123-4567-89ab-14ae3cbdf123'

    expect(service.url(token)).toBe(
      `https://app.orchardcollection.ca/nfc/${token}`,
    )
    expect(await service.toSvg(token)).toContain('<svg')
    expect(await service.toDataUrl(token)).toMatch(/^data:image\/png;base64,/)
  })
})

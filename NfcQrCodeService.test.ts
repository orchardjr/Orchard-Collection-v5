import { describe, expect, it, vi } from 'vitest'

const { toDataURL } = vi.hoisted(() => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,orchard'),
}))

vi.mock('qrcode', () => ({
  default: { toDataURL },
}))

import { generateNfcQrCode } from './NfcQrCodeService'

describe('NfcQrCodeService', () => {
  it('generates a high-contrast QR code for the canonical NFC URL', async () => {
    const token = '0aeebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    await expect(generateNfcQrCode(token)).resolves.toEqual({
      url: `https://app.orchardcollection.ca/nfc/${token}`,
      dataUrl: 'data:image/png;base64,orchard',
    })
    expect(toDataURL).toHaveBeenCalledWith(
      `https://app.orchardcollection.ca/nfc/${token}`,
      expect.objectContaining({
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      }),
    )
  })
})

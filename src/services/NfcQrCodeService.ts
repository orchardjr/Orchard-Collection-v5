import QRCode from 'qrcode'

import { orchardNfcUrl } from './NfcHardwareService'

export async function generateNfcQrCode(publicToken: string) {
  const url = orchardNfcUrl(publicToken)
  return {
    url,
    dataUrl: await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 768,
      color: { dark: '#000000', light: '#ffffff' },
    }),
  }
}

export async function downloadNfcQrCode(publicToken: string) {
  const qrCode = await generateNfcQrCode(publicToken)
  const link = document.createElement('a')
  link.href = qrCode.dataUrl
  link.download = `orchard-nfc-${publicToken}.png`
  link.click()
}

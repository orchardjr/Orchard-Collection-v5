import QRCode from 'qrcode'

import { orchardNfcUrl } from './NfcHardwareService'

export class QRService {
  url(publicToken: string) {
    return orchardNfcUrl(publicToken)
  }

  toSvg(publicToken: string) {
    return QRCode.toString(this.url(publicToken), {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
  }

  toDataUrl(publicToken: string, width = 768) {
    return QRCode.toDataURL(this.url(publicToken), {
      errorCorrectionLevel: 'M',
      margin: 2,
      width,
      color: { dark: '#000000', light: '#ffffff' },
    })
  }
}

export const qrService = new QRService()

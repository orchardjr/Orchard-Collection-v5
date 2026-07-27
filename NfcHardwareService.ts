export const ORCHARD_NFC_ORIGIN = 'https://app.orchardcollection.ca'

export type NfcErrorCode =
  | 'unsupported'
  | 'insecure'
  | 'permission'
  | 'cancelled'
  | 'write_failed'
  | 'read_failed'

export interface NfcRecordSnapshot {
  recordType: string
  mediaType?: string
  id?: string
  data?: string
}

export interface NfcReadResult {
  url?: string
  uid?: string
  tagType: string
  records: NfcRecordSnapshot[]
  belongsToOrchard: boolean
}

export interface NfcWriteResult {
  url: string
  verified: boolean
  readBack?: NfcReadResult
  verificationError?: string
}

interface NdefRecordLike {
  recordType?: string
  mediaType?: string
  id?: string
  data?: DataView | ArrayBuffer | string | null
}

interface NdefReadingEventLike extends Event {
  serialNumber?: string
  message?: { records?: NdefRecordLike[] }
}

interface NdefReaderLike {
  write(
    message: { records: Array<{ recordType: 'url'; data: string }> },
    options?: { signal?: AbortSignal },
  ): Promise<void>
  scan(options?: { signal?: AbortSignal }): Promise<void>
  addEventListener(
    type: 'reading' | 'readingerror',
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void
  removeEventListener(type: string, listener: EventListener): void
}

type NdefReaderConstructor = new () => NdefReaderLike

export class NfcHardwareError extends Error {
  constructor(
    readonly code: NfcErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'NfcHardwareError'
  }
}

function readerConstructor(): NdefReaderConstructor | undefined {
  return (
    window as typeof window & {
      NDEFReader?: NdefReaderConstructor
    }
  ).NDEFReader
}

export function orchardNfcUrl(publicToken: string) {
  return `${ORCHARD_NFC_ORIGIN}/nfc/${publicToken}`
}

export function getNfcCapability() {
  if (!window.isSecureContext)
    return {
      supported: false,
      reason: 'NFC writing requires a secure HTTPS connection.',
    } as const
  if (!readerConstructor())
    return {
      supported: false,
      reason:
        'Web NFC is not available in this browser. You can still copy the URL or download its QR code.',
    } as const
  return { supported: true } as const
}

function errorFrom(error: unknown, fallback: 'write_failed' | 'read_failed') {
  if (error instanceof NfcHardwareError) return error
  if (error instanceof DOMException) {
    if (error.name === 'AbortError')
      return new NfcHardwareError(
        'cancelled',
        'The NFC operation was cancelled.',
        { cause: error },
      )
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      return new NfcHardwareError(
        'permission',
        'NFC permission was not granted. Check browser permissions and try again.',
        { cause: error },
      )
  }
  return new NfcHardwareError(
    fallback,
    fallback === 'write_failed'
      ? 'The NFC tag could not be written. Keep it near the device and try again.'
      : 'The NFC tag could not be read. Keep it near the device and try again.',
    { cause: error },
  )
}

function requireReader() {
  const capability = getNfcCapability()
  if (!capability.supported)
    throw new NfcHardwareError(
      window.isSecureContext ? 'unsupported' : 'insecure',
      capability.reason,
    )
  return new (readerConstructor()!)()
}

function decodeData(data: NdefRecordLike['data']) {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer)
    return new TextDecoder().decode(new Uint8Array(data))
  if (data instanceof DataView)
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    )
  return undefined
}

function snapshot(event: NdefReadingEventLike): NfcReadResult {
  const records = (event.message?.records ?? []).map((record) => ({
    recordType: record.recordType ?? 'unknown',
    mediaType: record.mediaType,
    id: record.id,
    data: decodeData(record.data),
  }))
  const url = records.find((record) => record.recordType === 'url')?.data
  return {
    url,
    uid: event.serialNumber || undefined,
    tagType: records.length ? 'NDEF' : 'Unknown',
    records,
    belongsToOrchard: isOrchardNfcUrl(url),
  }
}

function isOrchardNfcUrl(value?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    return (
      url.origin === ORCHARD_NFC_ORIGIN &&
      /^\/nfc\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        url.pathname,
      ) &&
      !url.search &&
      !url.hash
    )
  } catch {
    return false
  }
}

export class NfcHardwareService {
  async readTag(signal?: AbortSignal): Promise<NfcReadResult> {
    const reader = requireReader()
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        reader.removeEventListener('reading', onReading)
        reader.removeEventListener('readingerror', onReadingError)
        signal?.removeEventListener('abort', onAbort)
      }
      const onReading = (event: Event) => {
        cleanup()
        resolve(snapshot(event as NdefReadingEventLike))
      }
      const onReadingError = () => {
        cleanup()
        reject(
          new NfcHardwareError(
            'read_failed',
            'The tag was detected but its NDEF data could not be read.',
          ),
        )
      }
      const onAbort = () => {
        cleanup()
        reject(new NfcHardwareError('cancelled', 'The NFC read was cancelled.'))
      }
      reader.addEventListener('reading', onReading)
      reader.addEventListener('readingerror', onReadingError)
      signal?.addEventListener('abort', onAbort, { once: true })
      reader.scan({ signal }).catch((error: unknown) => {
        cleanup()
        reject(errorFrom(error, 'read_failed'))
      })
    })
  }

  async writeTag(
    publicToken: string,
    signal?: AbortSignal,
  ): Promise<NfcWriteResult> {
    const url = orchardNfcUrl(publicToken)
    const reader = requireReader()
    try {
      await reader.write(
        { records: [{ recordType: 'url', data: url }] },
        { signal },
      )
    } catch (error) {
      throw errorFrom(error, 'write_failed')
    }

    try {
      const readBack = await this.readTag(signal)
      return {
        url,
        readBack,
        verified: readBack.url === url,
        verificationError:
          readBack.url === url
            ? undefined
            : 'The tag was written, but read-back did not match the assigned Orchard URL.',
      }
    } catch (error) {
      const verificationError =
        error instanceof Error
          ? error.message
          : 'Read-back verification failed.'
      return { url, verified: false, verificationError }
    }
  }
}

export const nfcHardwareService = new NfcHardwareService()

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getNfcCapability,
  NfcHardwareService,
  orchardNfcUrl,
} from './NfcHardwareService'

class MockNdefReader extends EventTarget {
  static instances: MockNdefReader[] = []
  static writeFailure?: Error
  readonly writes: unknown[] = []
  readonly writeOptions: unknown[] = []
  scan = vi.fn().mockResolvedValue(undefined)

  constructor() {
    super()
    MockNdefReader.instances.push(this)
  }

  async write(message: unknown, options?: unknown) {
    if (MockNdefReader.writeFailure) throw MockNdefReader.writeFailure
    this.writes.push(message)
    this.writeOptions.push(options)
  }

  emitReading({
    records,
    serialNumber = '04:A1:B2',
  }: {
    records: Array<Record<string, unknown>>
    serialNumber?: string
  }) {
    const event = new Event('reading')
    Object.defineProperties(event, {
      serialNumber: { value: serialNumber },
      message: { value: { records } },
    })
    this.dispatchEvent(event)
  }
}

function configureEnvironment({
  secure = true,
  supported = true,
}: {
  secure?: boolean
  supported?: boolean
} = {}) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: secure,
  })
  Object.defineProperty(window, 'NDEFReader', {
    configurable: true,
    value: supported ? MockNdefReader : undefined,
  })
}

describe('NfcHardwareService', () => {
  beforeEach(() => {
    MockNdefReader.instances = []
    MockNdefReader.writeFailure = undefined
    configureEnvironment()
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'NDEFReader')
  })

  it('detects supported, unsupported, and insecure environments', () => {
    expect(getNfcCapability()).toEqual({ supported: true })

    configureEnvironment({ supported: false })
    expect(getNfcCapability()).toMatchObject({ supported: false })

    configureEnvironment({ secure: false })
    expect(getNfcCapability()).toMatchObject({
      supported: false,
      reason: expect.stringContaining('HTTPS'),
    })
  })

  it('writes only the canonical public URL and verifies it by reading back', async () => {
    const service = new NfcHardwareService()
    const token = '0aeebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const expectedUrl = orchardNfcUrl(token)
    const resultPromise = service.writeTag(token)

    await vi.waitFor(() => expect(MockNdefReader.instances).toHaveLength(2))
    MockNdefReader.instances[1]?.emitReading({
      records: [{ recordType: 'url', data: expectedUrl }],
    })

    await expect(resultPromise).resolves.toMatchObject({
      url: expectedUrl,
      verified: true,
      readBack: { url: expectedUrl, belongsToOrchard: true },
    })
    expect(MockNdefReader.instances[0]?.writes).toEqual([
      { records: [{ recordType: 'url', data: expectedUrl }] },
    ])
    expect(JSON.stringify(MockNdefReader.instances[0]?.writes)).not.toContain(
      'internal',
    )
  })

  it('reports read-back verification failures', async () => {
    const service = new NfcHardwareService()
    const resultPromise = service.writeTag(
      '0aeebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    )

    await vi.waitFor(() => expect(MockNdefReader.instances).toHaveLength(2))
    MockNdefReader.instances[1]?.emitReading({
      records: [{ recordType: 'url', data: 'https://example.com/wrong' }],
    })

    await expect(resultPromise).resolves.toMatchObject({
      verified: false,
      verificationError: expect.stringContaining('did not match'),
    })
  })

  it('maps failed and cancelled writes to actionable errors', async () => {
    const service = new NfcHardwareService()
    MockNdefReader.writeFailure = new Error('Hardware failure')
    await expect(service.writeTag('token')).rejects.toMatchObject({
      code: 'write_failed',
    })

    MockNdefReader.writeFailure = new DOMException('Cancelled', 'AbortError')
    await expect(service.writeTag('token')).rejects.toEqual(
      expect.objectContaining({ code: 'cancelled' }),
    )
  })

  it('reads URL, UID, tag type, and all NDEF records', async () => {
    const service = new NfcHardwareService()
    const readPromise = service.readTag()
    const url =
      'https://app.orchardcollection.ca/nfc/0aeebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

    MockNdefReader.instances[0]?.emitReading({
      serialNumber: '04:AA:10',
      records: [
        { recordType: 'url', data: url },
        { recordType: 'text', data: 'Orchard Collection' },
      ],
    })

    await expect(readPromise).resolves.toEqual({
      url,
      uid: '04:AA:10',
      tagType: 'NDEF',
      belongsToOrchard: true,
      records: [
        {
          recordType: 'url',
          data: url,
          id: undefined,
          mediaType: undefined,
        },
        {
          recordType: 'text',
          data: 'Orchard Collection',
          id: undefined,
          mediaType: undefined,
        },
      ],
    })
  })

  it('rejects hardware actions on unsupported devices', async () => {
    configureEnvironment({ supported: false })
    await expect(new NfcHardwareService().readTag()).rejects.toMatchObject({
      code: 'unsupported',
    })
  })
})

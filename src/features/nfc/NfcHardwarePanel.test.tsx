import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { capabilityMock, downloadNfcQrCodeMock, readTagMock, writeTagMock } =
  vi.hoisted(() => ({
    capabilityMock: vi.fn(),
    downloadNfcQrCodeMock: vi.fn(),
    readTagMock: vi.fn(),
    writeTagMock: vi.fn(),
  }))

vi.mock('../../services/NfcHardwareService', () => ({
  getNfcCapability: capabilityMock,
  nfcHardwareService: {
    readTag: readTagMock,
    writeTag: writeTagMock,
  },
}))

vi.mock('../../services/NfcQrCodeService', () => ({
  downloadNfcQrCode: downloadNfcQrCodeMock,
}))

import { NfcHardwarePanel } from './NfcHardwarePanel'

describe('NfcHardwarePanel', () => {
  beforeEach(() => {
    capabilityMock.mockReturnValue({ supported: true })
    downloadNfcQrCodeMock.mockReset().mockResolvedValue(undefined)
    readTagMock.mockReset()
    writeTagMock.mockReset().mockResolvedValue({
      url: 'https://app.orchardcollection.ca/nfc/token',
      verified: true,
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('requires confirmation before rewriting a tag', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    render(<NfcHardwarePanel publicToken="token" />)

    fireEvent.click(screen.getByRole('button', { name: 'Write NFC Tag' }))
    expect(writeTagMock).not.toHaveBeenCalled()

    vi.mocked(window.confirm).mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Write NFC Tag' }))
    await waitFor(() => expect(writeTagMock).toHaveBeenCalled())
    expect(
      await screen.findByText('NFC tag written and verified successfully.'),
    ).toBeTruthy()
  })

  it('keeps the QR fallback available on unsupported devices', async () => {
    capabilityMock.mockReturnValue({
      supported: false,
      reason: 'Web NFC is unavailable.',
    })
    render(<NfcHardwarePanel publicToken="token" />)

    expect(screen.getByText('Web NFC is unavailable.')).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Write NFC Tag' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Read NFC Tag' })
        .hasAttribute('disabled'),
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Download QR' }))
    await waitFor(() =>
      expect(downloadNfcQrCodeMock).toHaveBeenCalledWith('token'),
    )
  })
})

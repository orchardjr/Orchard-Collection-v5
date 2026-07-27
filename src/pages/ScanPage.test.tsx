import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { capabilityMock, readTagMock } = vi.hoisted(() => ({
  capabilityMock: vi.fn(),
  readTagMock: vi.fn(),
}))

vi.mock('../services/NfcHardwareService', () => ({
  getNfcCapability: capabilityMock,
  nfcHardwareService: { readTag: readTagMock },
}))

vi.mock('../features/feeders/qrScanner', () => ({
  decodeQrVideoFrame: vi.fn(),
}))

import { ScanPage } from './ScanPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ScanPage />
    </MemoryRouter>,
  )
}

describe('ScanPage', () => {
  beforeEach(() => {
    capabilityMock.mockReturnValue({ supported: true })
    readTagMock.mockReset()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  it('launches the QR camera scanner', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }))

    await waitFor(() =>
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' },
      }),
    )
    expect(
      await screen.findByRole('button', { name: 'Stop QR Scanner' }),
    ).toBeTruthy()
  })

  it('launches the NFC scanner when Web NFC is supported', async () => {
    readTagMock.mockReturnValue(new Promise(() => undefined))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Scan NFC Tag' }))

    await waitFor(() => expect(readTagMock).toHaveBeenCalledOnce())
    expect(
      screen.getByRole('button', { name: 'Hold tag near device…' }),
    ).toBeTruthy()
  })

  it('hides only the unsupported NFC scanner', () => {
    capabilityMock.mockReturnValue({
      supported: false,
      reason: 'Web NFC is unavailable.',
    })
    renderPage()

    expect(screen.getByRole('button', { name: 'Scan QR Code' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Scan NFC Tag' })).toBeNull()
  })
})

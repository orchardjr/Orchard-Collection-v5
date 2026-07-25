import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const { resolvePublicTokenMock } = vi.hoisted(() => ({
  resolvePublicTokenMock: vi.fn(),
}))

vi.mock('../services/NfcTagService', () => ({
  nfcTagService: { resolvePublicToken: resolvePublicTokenMock },
}))

import { NfcResolvePage } from './NfcResolvePage'

describe('NfcResolvePage', () => {
  it('shows a friendly state without querying malformed tokens', async () => {
    render(
      <MemoryRouter initialEntries={['/nfc/not-a-token']}>
        <Routes>
          <Route path="/nfc/:token" element={<NfcResolvePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'NFC tag not recognized',
      }),
    ).toBeTruthy()
    expect(resolvePublicTokenMock).not.toHaveBeenCalled()
  })

  it('redirects a valid plant token to Plant Details', async () => {
    resolvePublicTokenMock.mockResolvedValue({
      publicToken: '0aeebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      resourceType: 'plant',
      resourceId: 'plant-42',
    })
    render(
      <MemoryRouter
        initialEntries={['/nfc/0aeebc99-9c0b-4ef8-bb6d-6bb9bd380a11']}
      >
        <Routes>
          <Route path="/nfc/:token" element={<NfcResolvePage />} />
          <Route
            path="/collection/:plantId"
            element={<h1>Resolved plant</h1>}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Resolved plant' }),
    ).toBeTruthy()
  })
})

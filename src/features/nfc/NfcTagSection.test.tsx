import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NfcTagSection } from './NfcTagSection'

describe('NfcTagSection', () => {
  it('keeps the plant usable when the optional NFC schema is unavailable', () => {
    render(
      <NfcTagSection
        plantName="Monstera"
        loading={false}
        loadError="Cloud read failed. Check your connection and retry."
        pending={false}
        onAssign={vi.fn()}
        onReplace={vi.fn()}
        onRemove={vi.fn()}
        onResetError={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/NFC features are temporarily unavailable/i),
    ).toBeTruthy()
    expect(screen.getByText(/This plant is still available/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Assign NFC Tag/i })).toBeNull()
  })
})

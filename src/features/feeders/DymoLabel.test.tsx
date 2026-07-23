import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FeederColony } from '../../models/Feeder'
import { DymoLabel } from './DymoLabel'

vi.mock('./QrCode', () => ({
  FeederQrCode: ({ value }: { value: string }) => (
    <img src="data:image/png;base64,test" alt={`QR code for ${value}`} />
  ),
}))

const colony: FeederColony = {
  id: 'colony-record-1',
  colonyId: 'DSC-001',
  name: 'Primary discoid colony',
  speciesId: 'species-1',
  type: 'discoid-breeder',
  status: 'active',
  dateStarted: new Date('2026-07-01T12:00:00Z'),
  binId: 'BIN-A1',
  qrValue: 'orchard:colony:DSC-001',
  createdAt: new Date('2026-07-01T12:00:00Z'),
  updatedAt: new Date('2026-07-01T12:00:00Z'),
}

describe('DYMO print preview', () => {
  it('renders one label and keeps its QR code inside the printable page', () => {
    const { container } = render(
      <main className="dymo-print-root">
        <DymoLabel record={colony} species="Discoid Roach" />
      </main>,
    )

    expect(container.querySelectorAll('.dymo-label')).toHaveLength(1)
    expect(container.querySelectorAll('.dymo-print-root')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'DSC-001' })).toBeTruthy()
    expect(screen.queryByText(/Orchard Chameleons/)).toBeNull()
    expect(
      screen.getByRole('img', { name: /QR code/ }).closest('.dymo-label-qr'),
    ).not.toBeNull()
    expect(
      screen.getByRole('img', { name: /QR code/ }).getAttribute('alt'),
    ).toBe('QR code for http://localhost:3000/feeders/colonies/DSC-001')
  })

  it('defines one landscape page with DYMO driver overflow tolerance', () => {
    const css = readFileSync('src/styles/index.css', 'utf8')

    expect(css).toMatch(/@page\s*{\s*size:\s*4in 2\.125in;\s*margin:\s*0;/)
    expect(css).toMatch(
      /\.dymo-print-root,\s*\.dymo-label\s*{[\s\S]*?width:\s*4in;[\s\S]*?height:\s*2\.11in;/,
    )
    expect(css).toMatch(/\.dymo-label-qr\s*{[\s\S]*?width:\s*0\.92in;/)
    expect(css).toMatch(/padding:\s*0\.22in 0\.15in 0\.12in 0\.32in;/)
    expect(css).toMatch(/overflow:\s*hidden;/)
    expect(css).toMatch(/page-break-after:\s*avoid;/)
  })
})

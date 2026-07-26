import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCollectionReadDiagnostic,
  reportCollectionRead,
} from '../../data/collectionReadDiagnostics'
import { RepositoryErrorBoundary } from './RepositoryErrorBoundary'

function BrokenCollection(): never {
  throw new Error('Cloud read failed')
}

describe('RepositoryErrorBoundary', () => {
  beforeEach(() => {
    clearCollectionReadDiagnostic()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('offers local-only recovery and reports structured diagnostics', () => {
    reportCollectionRead({
      repository: 'plants',
      operation: 'getAll',
      category: 'authorization',
      error: { status: 403, code: '42501' },
      fallbackAttempted: true,
      dexieOpened: false,
      timestamp: '2026-07-26T00:00:00.000Z',
    })

    render(
      <RepositoryErrorBoundary>
        <BrokenCollection />
      </RepositoryErrorBoundary>,
    )

    expect(
      screen.getByRole('button', { name: 'Use local collection' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Retry cloud connection' }),
    ).toBeTruthy()
    expect(screen.getByText('Diagnostic details')).toBeTruthy()
    expect(screen.getByText('plants')).toBeTruthy()
    expect(screen.getByText('authorization')).toBeTruthy()
  })
})

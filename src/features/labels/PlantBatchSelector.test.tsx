import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Plant } from '../../models'
import { PlantBatchSelector } from './PlantBatchSelector'

function plant(id: string, status: Plant['status']): Plant {
  const now = new Date('2026-08-03T12:00:00.000Z')
  return {
    id,
    nickname: id,
    scientificName: `${id} scientific`,
    kind: 'plant',
    status,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

describe('PlantBatchSelector', () => {
  it('defaults Label Studio to active plants', () => {
    render(
      <PlantBatchSelector
        plants={[
          plant('Active violet', 'active'),
          plant('Archived fern', 'archived'),
        ]}
        selected={new Set()}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Active violet')).toBeTruthy()
    expect(screen.queryByText('Archived fern')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Filter plants' })).toHaveValue(
      'active',
    )
  })

  it('can show archived and all plants', () => {
    render(
      <PlantBatchSelector
        plants={[
          plant('Active violet', 'active'),
          plant('Archived fern', 'archived'),
        ]}
        selected={new Set()}
        onChange={vi.fn()}
      />,
    )
    const filter = screen.getByRole('combobox', { name: 'Filter plants' })
    fireEvent.change(filter, { target: { value: 'archived' } })
    expect(screen.getByText('Archived fern')).toBeTruthy()
    expect(screen.queryByText('Active violet')).toBeNull()

    fireEvent.change(filter, { target: { value: 'all' } })
    expect(screen.getByText('Active violet')).toBeTruthy()
    expect(screen.getByText('Archived fern')).toBeTruthy()
  })
})

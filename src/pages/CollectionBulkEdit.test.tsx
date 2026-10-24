import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Plant } from '../models'
vi.mock('../hooks/useOrchardData', () => ({
  usePlants: () => ({
    data: ['Aloe', 'Fern', 'Archived'].map((id) => ({
      id,
      nickname: id,
      scientificName: id,
      status: id === 'Archived' ? 'archived' : 'active',
      createdAt: new Date(),
    })),
  }),
  useAllMedia: () => ({ data: [] }),
  useSpaces: () => ({ data: [] }),
  usePlantMutations: () => ({
    archivePlant: {},
    createPlant: {},
    updatePlant: {},
    restorePlant: {},
  }),
}))
vi.mock('../features/tasks/usePlantAssignmentTags', () => ({
  usePlantAssignmentTags: () => ({ data: [] }),
}))
vi.mock('../features/plants/PlantCard', () => ({
  PlantCard: ({ plant }: { plant: Plant }) => <div>{plant.nickname}</div>,
}))
vi.mock('../features/plants/BulkPlantEditDialog', () => ({
  BulkPlantEditDialog: ({
    plants,
    onSaved,
  }: {
    plants: Plant[]
    onSaved: () => void
  }) => (
    <div role="dialog">
      <span>{plants.map((plant) => plant.id).join(',')}</span>
      <button onClick={onSaved}>Finish bulk edit</button>
    </div>
  ),
}))
import { CollectionPage } from './CollectionPage'
describe('Collection bulk selection', () => {
  it('uses the current filter, excludes archived plants by default, and clears selection after saving', () => {
    render(
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.getByRole('button', { name: 'Edit selected' })).toBeDisabled()
    fireEvent.click(screen.getByText('Select all filtered plants'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search plants'), {
      target: { value: 'Fern' },
    })
    fireEvent.click(screen.getByText('Select all filtered plants'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit selected' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Fern')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Aloe')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Archived')
    fireEvent.click(screen.getByText('Finish bulk edit'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
  })
  it('allows archived plants only when explicitly selected from that scope', () => {
    render(
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Filter'), {
      target: { value: 'archived' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(screen.getByLabelText('Select Archived'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit selected' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Archived')
  })
})

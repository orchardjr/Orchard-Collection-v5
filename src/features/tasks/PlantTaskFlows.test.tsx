import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CollectionPage } from '../../pages/CollectionPage'
import { PlantDetailsPage } from '../../pages/PlantDetailsPage'
import type { Plant } from '../../models'
const mocks = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue(undefined),
  complete: vi.fn().mockResolvedValue(undefined),
}))
const now = new Date()
const plants: Plant[] = [
  {
    id: 'a',
    nickname: 'Cattleya',
    scientificName: 'Cattleya orchid',
    kind: 'plant',
    status: 'active',
    favorite: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'b',
    nickname: 'Dendrobium',
    scientificName: 'Dendrobium orchid',
    kind: 'plant',
    status: 'active',
    favorite: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c',
    nickname: 'Fern',
    scientificName: 'Fern',
    kind: 'plant',
    status: 'active',
    favorite: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'd',
    nickname: 'Archived orchid',
    scientificName: 'Orchid',
    kind: 'plant',
    status: 'archived',
    favorite: false,
    createdAt: now,
    updatedAt: now,
  },
]
vi.mock('../../hooks/useOrchardData', () => {
  const mutation = () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null,
  })
  return {
    usePlants: () => ({ data: plants, isLoading: false }),
    usePlant: () => ({ data: plants[0], isLoading: false }),
    useAllMedia: () => ({ data: [], isLoading: false }),
    usePlantMedia: () => ({ data: [], isLoading: false }),
    useSpaces: () => ({ data: [] }),
    usePlantTimeline: () => ({ data: [], isLoading: false }),
    useTasks: () => ({ data: [] }),
    usePlantNfcTag: () => ({ data: null, isLoading: false }),
    useNfcTagMutations: () => ({
      assignTag: mutation(),
      replaceTag: mutation(),
      unassignTag: mutation(),
    }),
    usePlantMutations: () => ({
      archivePlant: mutation(),
      createPlant: mutation(),
      updatePlant: mutation(),
      restorePlant: mutation(),
      deletePlant: mutation(),
      resetErrors: vi.fn(),
    }),
    useTaskMutations: () => ({
      createTask: { ...mutation(), mutateAsync: mocks.create },
      completeTask: { ...mutation(), mutateAsync: mocks.complete },
    }),
    useCareMutation: () => mutation(),
  }
})
vi.mock('./usePlantAssignmentTags', () => ({
  usePlantAssignmentTags: () => ({ data: [] }),
}))
beforeEach(() => {
  mocks.create.mockClear()
})
describe('plant and Collection task shortcuts', () => {
  it('creates one task from all filtered active Collection plants', async () => {
    render(
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Search plants'), {
      target: { value: 'orchid' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all filtered plants' }),
    )
    expect(screen.getByText('2 selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    fireEvent.change(screen.getByLabelText('Task name'), {
      target: { value: 'Inspect orchids' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0]![0].plantIds).toEqual(['a', 'b'])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('opens a preassigned form directly from the plant header', async () => {
    render(
      <MemoryRouter initialEntries={['/collection/a']}>
        <Routes>
          <Route path="/collection/:plantId" element={<PlantDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(
      (screen.getByRole('checkbox', { name: /Cattleya/ }) as HTMLInputElement)
        .checked,
    ).toBe(true)
    fireEvent.change(screen.getByLabelText('Task name'), {
      target: { value: 'Photograph Cattleya' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create.mock.calls[0]![0].plantIds).toEqual(['a'])
  })
  it('offers the same preassigned form from the plant Tasks tab', async () => {
    render(
      <MemoryRouter initialEntries={['/collection/a']}>
        <Routes>
          <Route path="/collection/:plantId" element={<PlantDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Tasks' }))
    const buttons = await screen.findAllByRole('button', { name: 'Add task' })
    fireEvent.click(buttons[buttons.length - 1]!)
    expect(
      (screen.getByRole('checkbox', { name: /Cattleya/ }) as HTMLInputElement)
        .checked,
    ).toBe(true)
  })
})

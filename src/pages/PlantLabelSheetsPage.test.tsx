import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlantLabelSheetsPage } from './PlantLabelSheetsPage'
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  save: vi.fn(),
  error: null as Error | null,
}))
vi.mock('../services/PlantLabelPdfService', () => ({
  createPlantLabelPdf: mocks.create,
}))
vi.mock('../features/plants/useCollectionPrintData', () => ({
  useCollectionPrintData: () => ({
    loading: false,
    error: mocks.error,
    retry: vi.fn(),
    spaces: [],
    media: [],
    tags: [],
    plants: ['Aloe', 'Fern', 'Old'].map((id, i) => ({
      id,
      nickname: id,
      scientificName: id,
      status: i === 2 ? 'archived' : 'active',
      createdAt: new Date('2026-01-01'),
    })),
  }),
}))
describe('Plant label sheet setup', () => {
  beforeEach(() => {
    mocks.error = null
    mocks.create.mockReset()
    mocks.save.mockReset()
    mocks.create.mockResolvedValue({
      pdf: { save: mocks.save },
      borders: true,
      sheets: [
        [
          {
            plantId: 'Aloe',
            x: 27,
            y: 36,
            width: 180,
            height: 36,
            text: [{ text: 'Aloe', x: 4, y: 12, size: 11, bold: true }],
          },
          { plantId: 'Fern', x: 216, y: 36, width: 180, height: 36, text: [] },
        ],
      ],
    })
  })
  it('previews a real tiled sheet before enabling PDF download, and invalidates changed settings', async () => {
    render(
      <MemoryRouter>
        <PlantLabelSheetsPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('2 labels • 51 labels per sheet • 1 page'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Download label PDF' }),
    ).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview label sheets' }),
    )
    await screen.findByRole('img', { name: 'Letter sheet 1 with 2 labels' })
    expect(
      mocks.create.mock.calls[0]![0].map((p: { id: string }) => p.id),
    ).toEqual(['Aloe', 'Fern'])
    fireEvent.click(screen.getByRole('button', { name: 'Download label PDF' }))
    expect(mocks.save).toHaveBeenCalledWith('orchard-plant-labels-letter.pdf')
    fireEvent.change(screen.getByLabelText('Copies per plant'), {
      target: { value: '3' },
    })
    expect(
      screen.getByText('6 labels • 51 labels per sheet • 1 page'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Download label PDF' }),
    ).toBeDisabled()
  })
  it('accepts current Collection filter and selection, with a searchable multi-select picker', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/collection/labels',
            state: {
              initialSource: 'filtered',
              filteredIds: ['Fern', 'Old'],
              selectedIds: ['Aloe'],
            },
          },
        ]}
      >
        <PlantLabelSheetsPage />
      </MemoryRouter>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview label sheets' }),
    )
    await waitFor(() => expect(mocks.create).toHaveBeenCalled())
    expect(
      mocks.create.mock.calls[0]![0].map((p: { id: string }) => p.id),
    ).toEqual(['Fern', 'Old'])
    await waitFor(() =>
      expect(screen.getByLabelText('Plants to label')).not.toBeDisabled(),
    )
    fireEvent.change(screen.getByLabelText('Plants to label'), {
      target: { value: 'selected' },
    })
    fireEvent.change(screen.getByLabelText('Search plants'), {
      target: { value: 'Fern' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fern Fern' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview label sheets' }),
    )
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2))
    expect(
      mocks.create.mock.calls[1]![0].map((p: { id: string }) => p.id),
    ).toEqual(['Aloe', 'Fern'])
  })
  it('blocks failed data and reports PDF generation errors', async () => {
    mocks.create.mockRejectedValue(new Error('Fonts unavailable'))
    render(
      <MemoryRouter>
        <PlantLabelSheetsPage />
      </MemoryRouter>,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview label sheets' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fonts unavailable',
    )
    expect(
      screen.getByRole('button', { name: 'Download label PDF' }),
    ).toBeDisabled()
  })
})

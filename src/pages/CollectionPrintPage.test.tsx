import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CollectionPrintPage } from './CollectionPrintPage'
const state = vi.hoisted(() => ({
  loading: false,
  error: null as Error | null,
  retry: vi.fn(),
}))
vi.mock('../features/plants/useCollectionPrintData', () => ({
  useCollectionPrintData: () => ({
    ...state,
    spaces: [],
    plants: [
      {
        id: 'a',
        nickname: 'Aloe',
        scientificName: 'Aloe vera',
        status: 'active',
        createdAt: new Date(),
      },
      {
        id: 'b',
        nickname: 'Fern',
        scientificName: 'Fern',
        status: 'active',
        createdAt: new Date(),
      },
      {
        id: 'c',
        nickname: 'Old plant',
        scientificName: 'Old plant',
        status: 'archived',
        createdAt: new Date(),
      },
    ],
    tags: [{ resourceType: 'plant', resourceId: 'a', publicToken: 'TAG-A' }],
    media: [
      {
        id: 'image-a',
        plantId: 'a',
        uploadedAt: new Date(),
        thumbnailUrl: '/thumb.webp',
      },
    ],
  }),
}))
vi.mock('../features/media/OrchardImage', () => ({
  OrchardImage: ({ thumbnailSrc }: { thumbnailSrc: string }) => (
    <img alt="Plant thumbnail" src={thumbnailSrc} />
  ),
}))
describe('Print Collection audit setup and report', () => {
  beforeEach(() => {
    state.loading = false
    state.error = null
  })
  it('keeps audit optional and combines filters, fields, thumbnails and archived scope', () => {
    render(
      <MemoryRouter>
        <CollectionPrintPage />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('region', { name: 'Collection Audit' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Plant thumbnail' }),
    ).toHaveAttribute('src', '/thumb.webp')
    fireEvent.click(screen.getByLabelText('NFC Status'))
    fireEvent.click(screen.getByLabelText('Photo Status'))
    const report = screen.getByRole('main')
    expect(within(report).getByText('TAG-A')).toBeInTheDocument()
    expect(within(report).getByText('Assigned')).toBeInTheDocument()
    expect(within(report).getByText('Not assigned')).toBeInTheDocument()
    expect(within(report).getByText('1 photo')).toBeInTheDocument()
    expect(within(report).getByText('No photos')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Collection Audit' }),
    ).toHaveTextContent(
      '2 plants • 1 without NFC • 1 without photos • 1 missing both',
    )
    fireEvent.change(
      screen.getByLabelText('Collection Status / Missing Information'),
      { target: { value: 'both' } },
    )
    expect(within(report).queryByText('Aloe')).not.toBeInTheDocument()
    expect(within(report).getAllByText('Fern')).toHaveLength(3)
    fireEvent.change(screen.getByLabelText('Plants to print'), {
      target: { value: 'archived' },
    })
    expect(within(report).getAllByText('Old plant').length).toBeGreaterThan(0)
    expect(within(report).queryByText('Fern')).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Collection Audit' }),
    ).toHaveTextContent(
      '1 plants • 1 without NFC • 1 without photos • 1 missing both',
    )
  })
  it.each(['loading', 'error'])(
    'prevents printing misleading missing counts during %s',
    (mode) => {
      state.loading = mode === 'loading'
      state.error = mode === 'error' ? new Error('Read failed') : null
      render(
        <MemoryRouter>
          <CollectionPrintPage />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByLabelText('NFC Status'))
      expect(
        screen.getByRole('button', { name: 'Print report' }),
      ).toBeDisabled()
      expect(
        screen.queryByRole('region', { name: 'Collection Audit' }),
      ).not.toBeInTheDocument()
      expect(
        within(screen.getByRole('main')).queryByText('Not assigned'),
      ).not.toBeInTheDocument()
    },
  )
})

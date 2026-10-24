import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collectionAttention } from './collectionAttention'
const mocks = vi.hoisted(() => ({ data: vi.fn(), retry: vi.fn() }))
vi.mock('./useCollectionAttention', () => ({
  useCollectionAttention: mocks.data,
}))
import { NeedsAttentionCard } from './NeedsAttentionCard'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.data.mockReturnValue({
    attention: collectionAttention([], [], [], []),
    loading: false,
    error: null,
    retry: mocks.retry,
    local: false,
  })
})
const show = () =>
  render(
    <MemoryRouter>
      <NeedsAttentionCard />
    </MemoryRouter>,
  )
describe('Needs attention dashboard card', () => {
  it('shows counts and durable Collection links while deduplicating the total', () => {
    const data = mocks.data()
    data.attention.noPhotos.add('a')
    data.attention.noNfc.add('a')
    show()
    expect(screen.getByText(/1 plants need attention/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1 No photos' })).toHaveAttribute(
      'href',
      '/collection?attention=noPhotos',
    )
    expect(screen.getAllByRole('link')).toHaveLength(6)
  })
  it('never displays zero counts or actionable links when loading or failed', () => {
    mocks.data.mockReturnValue({
      ...mocks.data(),
      error: new Error('read failed'),
    })
    show()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Counts are unavailable',
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Retry attention data'))
    expect(mocks.retry).toHaveBeenCalledOnce()
  })
  it('shows a loading state instead of missing-data claims', () => {
    mocks.data.mockReturnValue({ ...mocks.data(), loading: true })
    show()
    expect(screen.getByRole('status')).toHaveTextContent('Checking')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('preserves explicit local-collection mode in links', () => {
    mocks.data.mockReturnValue({ ...mocks.data(), local: true })
    show()
    expect(screen.getByRole('link', { name: '0 No location' })).toHaveAttribute(
      'href',
      '/collection?attention=noLocation&source=local',
    )
    expect(
      screen.getByText('No missing information or overdue care found.'),
    ).toBeInTheDocument()
  })
})

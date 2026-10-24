import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plant, Space } from '../../models'
const mocks = vi.hoisted(() => ({ apply: vi.fn(), list: vi.fn() }))
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  requireSupabase: vi.fn(),
}))
vi.mock('../../services/PlantTagService', async (original) => ({
  ...(await original<typeof import('../../services/PlantTagService')>()),
  plantTagService: { list: mocks.list },
}))
vi.mock('../../services/BulkPlantService', async (original) => ({
  ...(await original<typeof import('../../services/BulkPlantService')>()),
  bulkPlantService: { apply: mocks.apply },
}))
import { BulkPlantEditDialog } from './BulkPlantEditDialog'
const plants = ['Aloe', 'Fern'].map(
  (id) => ({ id, nickname: id, status: 'active' }) as Plant,
)
const spaces = [{ id: 'shelf', name: 'Shelf' } as Space]
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const onSaved = vi.fn(),
    onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <BulkPlantEditDialog
        plants={plants}
        spaces={spaces}
        onClose={onClose}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  )
  return { onSaved, onClose, invalidate }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.list.mockResolvedValue([{ id: 'old', name: 'Old' }])
  mocks.apply.mockResolvedValue({ succeeded: ['Aloe', 'Fern'], failed: [] })
})
describe('bulk edit confirmation', () => {
  it('does not save unchanged values or before confirmation; preserves unchecked fields', async () => {
    const { onSaved, invalidate } = setup()
    fireEvent.click(screen.getByText('Review changes'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose at least one change',
    )
    fireEvent.change(screen.getByLabelText('Space/location'), {
      target: { value: 'shelf' },
    })
    fireEvent.click(screen.getByText('Review changes'))
    expect(screen.getByText('Confirm changes to 2 plants')).toBeInTheDocument()
    expect(mocks.apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Apply to 2 plants'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(mocks.apply).toHaveBeenCalledWith(
      ['Aloe', 'Fern'],
      {
        spaceId: 'shelf',
        addTags: [],
        removeTags: [],
        waterIntervalDays: undefined,
        fertilizerIntervalDays: undefined,
      },
      expect.any(Function),
    )
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['plant-assignment-tags'],
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] })
  })
  it('reviews explicit tag and care edits, and Back/Cancel never writes', async () => {
    const { onClose } = setup()
    fireEvent.change(screen.getByLabelText('Add tags (comma-separated)'), {
      target: { value: 'Orchid, Orchid' },
    })
    fireEvent.click(await screen.findByLabelText('Old'))
    fireEvent.change(screen.getByLabelText('Watering interval'), {
      target: { value: 'set' },
    })
    fireEvent.change(screen.getByLabelText('Watering every (days)'), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByText('Review changes'))
    expect(screen.getByText('Add tags: Orchid')).toBeInTheDocument()
    expect(screen.getByText('Remove tags: Old')).toBeInTheDocument()
    expect(screen.getByText('Watering: every 10 days')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Back'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
    expect(mocks.apply).not.toHaveBeenCalled()
  })
  it('reports partial results and retries failed IDs only', async () => {
    mocks.apply
      .mockResolvedValueOnce({
        succeeded: ['Aloe'],
        failed: [{ id: 'Fern', name: 'Fern', message: '[42501] denied' }],
      })
      .mockResolvedValueOnce({ succeeded: ['Fern'], failed: [] })
    const { onSaved } = setup()
    fireEvent.change(screen.getByLabelText('Fertilizing interval'), {
      target: { value: 'disabled' },
    })
    fireEvent.click(screen.getByText('Review changes'))
    fireEvent.click(screen.getByText('Apply to 2 plants'))
    expect(
      await screen.findByText('1 plants saved; 1 need attention.'),
    ).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Retry failed plants'))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(mocks.apply.mock.calls[1]?.[0]).toEqual(['Fern'])
  })
  it('blocks duplicate submissions and closing while saving', async () => {
    let resolve!: (value: { succeeded: string[]; failed: never[] }) => void
    mocks.apply.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { onClose, onSaved } = setup()
    fireEvent.change(screen.getByLabelText('Space/location'), {
      target: { value: 'none' },
    })
    fireEvent.click(screen.getByText('Review changes'))
    fireEvent.click(screen.getByText('Apply to 2 plants'))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(mocks.apply).toHaveBeenCalledOnce()
    resolve({ succeeded: ['Aloe', 'Fern'], failed: [] })
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  })
})

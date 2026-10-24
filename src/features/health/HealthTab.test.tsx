import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { HealthTab } from './HealthTab'
import type { Plant } from '../../models'
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  query: { data: [], isPending: false, error: null, refetch: vi.fn() },
}))
vi.mock('./usePlantHealth', () => ({
  usePlantHealth: () => ({
    ...mocks.query,
    save: {
      mutateAsync: mocks.save,
      isPending: false,
      error: null,
      reset: vi.fn(),
    },
  }),
}))
vi.mock('../tasks/PlantTaskDialog', () => ({
  PlantTaskDialog: ({
    plantIds,
    initialValues,
  }: {
    plantIds: string[]
    initialValues: { title: string }
  }) => (
    <div role="dialog">
      {plantIds.join(',')} {initialValues.title}
    </div>
  ),
}))
const plant = { id: 'p', nickname: 'Orchid', status: 'active' } as Plant
beforeEach(() => {
  vi.clearAllMocks()
  mocks.save.mockResolvedValue({})
  mocks.query.error = null
})
it('saves a health observation and opens a preassigned follow-up only when requested', async () => {
  render(<HealthTab plant={plant} media={[]} onPhotos={vi.fn()} />)
  expect(screen.getByText('Current status: Not recorded')).toBeInTheDocument()
  fireEvent.click(screen.getByText('Record health update'))
  fireEvent.change(screen.getByLabelText('Health status'), {
    target: { value: 'quarantined' },
  })
  fireEvent.change(
    screen.getByLabelText('Symptoms, pests, treatment and progress notes'),
    { target: { value: 'Isolated for inspection' } },
  )
  fireEvent.click(screen.getByText('Save health update'))
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith({
      plantId: 'p',
      status: 'quarantined',
      notes: 'Isolated for inspection',
      mediaId: undefined,
    }),
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Health update saved',
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Add follow-up task'))
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'p Health follow-up: Orchid',
  )
})
it('cancels without saving and retains entered notes on a failed save', async () => {
  render(<HealthTab plant={plant} media={[]} onPhotos={vi.fn()} />)
  fireEvent.click(screen.getByText('Record health update'))
  fireEvent.click(screen.getByText('Cancel'))
  expect(mocks.save).not.toHaveBeenCalled()
  mocks.save.mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(screen.getByText('Record health update'))
  fireEvent.change(
    screen.getByLabelText('Symptoms, pests, treatment and progress notes'),
    { target: { value: 'Keep me' } },
  )
  fireEvent.click(screen.getByText('Save health update'))
  await waitFor(() => expect(mocks.save).toHaveBeenCalled())
  expect(
    screen.getByLabelText('Symptoms, pests, treatment and progress notes'),
  ).toHaveValue('Keep me')
})

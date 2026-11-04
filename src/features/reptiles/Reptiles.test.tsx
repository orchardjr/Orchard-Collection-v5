import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReptileData } from './types'
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  rpc: vi.fn(),
  data: {} as ReptileData,
}))
vi.mock('./reptileService', () => ({
  reptilesRepo: { create: mocks.create },
  eventsRepo: { create: mocks.create },
  supplementsRepo: { create: mocks.create },
  routinesRepo: {},
  reptileMediaRepo: {},
}))
vi.mock('./useReptiles', () => ({
  useReptiles: () => ({
    configured: true,
    isPending: false,
    data: mocks.data,
    action: {
      mutateAsync: (op: () => Promise<unknown>) => op(),
      isPending: false,
    },
  }),
}))
vi.mock('../../lib/supabase', () => ({
  requireSupabase: () => ({ rpc: mocks.rpc }),
  isSupabaseConfigured: true,
}))
import { ReptilesPage } from '../../pages/ReptilesPage'
import { EventDialog } from './EventDialog'
import { RoutineDialog } from './RoutineDialog'
import { SupplementCalendar } from './SupplementCalendar'
import { WeightPanel } from './WeightPanel'
import { PrintDustingCalendar } from './PrintDustingCalendar'
const date = new Date()
const base = { createdAt: date, updatedAt: date }
it('offers a read-only monthly print setup with active reptile selection', () => {
  render(<PrintDustingCalendar data={mocks.data} onClose={vi.fn()} />)
  expect(screen.getByRole('checkbox', { name: 'Echo' })).toBeChecked()
  expect(
    screen.queryByRole('checkbox', { name: 'Archived reptile' }),
  ).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Calendar month'), {
    target: { value: '2026-12' },
  })
  expect(
    screen.getByRole('region', { name: 'Dusting calendar preview' }),
  ).toHaveTextContent('2026-12')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Echo' }))
  expect(
    screen.getByRole('button', { name: 'Download calendar PDF' }),
  ).toBeDisabled()
  fireEvent.click(
    screen.getByRole('button', { name: 'Select all active reptiles' }),
  )
  expect(
    screen.getByRole('button', { name: 'Download calendar PDF' }),
  ).toBeEnabled()
  expect(mocks.create).not.toHaveBeenCalled()
  expect(mocks.rpc).not.toHaveBeenCalled()
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({ id: 'saved' })
  mocks.rpc.mockResolvedValue({ error: null })
  mocks.data = {
    reptiles: [
      {
        ...base,
        id: 'a',
        name: 'Echo',
        species: 'Panther chameleon',
        sex: 'female',
        status: 'active',
        identification: {},
        husbandry: {},
        attention: true,
        deleting: false,
      },
      {
        ...base,
        id: 'b',
        name: 'Archived reptile',
        species: 'Species',
        sex: 'unknown',
        status: 'archived',
        identification: {},
        husbandry: {},
        attention: false,
        deleting: false,
      },
    ],
    events: [],
    routines: [],
    supplements: [],
    media: [],
    tasks: [],
  }
})
it('shows the integrated dashboard, defaults to active and creates a profile', async () => {
  render(
    <MemoryRouter>
      <ReptilesPage />
    </MemoryRouter>,
  )
  expect(screen.getByText('Echo')).toBeInTheDocument()
  expect(screen.queryByText('Archived reptile')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add reptile' }))
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'New reptile' },
  })
  fireEvent.change(screen.getByLabelText('Species'), {
    target: { value: 'Species' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New reptile',
        status: 'active',
        sex: 'unknown',
      }),
    ),
  )
})
it('logs multiple feeder types without administering supplements', async () => {
  render(
    <EventDialog
      animal={mocks.data.reptiles[0]!}
      kind="feeding"
      onClose={vi.fn()}
      onSave={(op) => op()}
    />,
  )
  fireEvent.click(screen.getByText('Add another feeder type'))
  const types = screen.getAllByLabelText('Feeder type (custom allowed)')
  fireEvent.change(types[1]!, { target: { value: 'Silkworms' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalled())
  expect(mocks.create.mock.calls[0]![0].kind).toBe('feeding')
  expect(mocks.create.mock.calls[0]![0].payload.feeders).toHaveLength(2)
})
it('shows female reproductive fields without forcing them', () => {
  render(
    <EventDialog
      animal={mocks.data.reptiles[0]!}
      kind="health"
      onClose={vi.fn()}
      onSave={(op) => op()}
    />,
  )
  expect(screen.getByLabelText('Clutch size')).toBeInTheDocument()
  expect(screen.getByLabelText('Laying-bin observations')).toBeInTheDocument()
})
it('records an explicit unscheduled supplement administration without completing a task', async () => {
  render(
    <EventDialog
      animal={mocks.data.reptiles[0]!}
      kind="supplement"
      supplements={[
        {
          ...base,
          id: 'product',
          name: 'Calcium',
          brand: 'Example',
          category: 'calcium-d3',
          d3: 'yes',
          notes: '',
        },
      ]}
      onClose={vi.fn()}
      onSave={(op) => op()}
    />,
  )
  fireEvent.change(screen.getByLabelText('Supplement given'), {
    target: { value: 'product' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'supplement',
        payload: expect.objectContaining({
          productName: 'Calcium',
          d3: 'yes',
          manual: true,
        }),
      }),
    ),
  )
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('assigns a user-configured schedule through an atomic owner-checked call', async () => {
  render(
    <RoutineDialog
      animal={mocks.data.reptiles[0]!}
      animals={mocks.data.reptiles}
      supplements={[]}
      onClose={vi.fn()}
      onSave={(op) => op()}
    />,
  )
  fireEvent.change(screen.getByLabelText('Task / routine name'), {
    target: { value: 'Weigh' },
  })
  fireEvent.change(screen.getByLabelText('Task type'), {
    target: { value: 'weigh' },
  })
  fireEvent.change(screen.getByLabelText('Repeat'), {
    target: { value: 'weekdays' },
  })
  fireEvent.click(screen.getByLabelText('Monday'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(mocks.rpc).toHaveBeenCalledWith(
      'create_reptile_routines',
      expect.objectContaining({
        reptile_ids: ['a'],
        input: expect.objectContaining({
          frequency: 'weekdays',
          weekdays: [1],
        }),
      }),
    ),
  )
})
it('makes D3 overlaps and overdue states visible and requires an explicit given action', () => {
  const due = new Date(Date.now() - 3600000)
  mocks.data.supplements = ['s1', 's2'].map((id) => ({
    ...base,
    id,
    name: id,
    brand: 'Brand',
    category: 'calcium-d3',
    d3: 'yes',
    notes: '',
  }))
  mocks.data.routines = ['s1', 's2'].map((id, i) => ({
    ...base,
    id: 'r' + i,
    reptileId: 'a',
    supplementId: id,
    title: 'Dust',
    type: 'supplement',
    frequency: 'days',
    intervalCount: 14,
    weekdays: [],
    customDates: [],
    startsAt: due.toISOString(),
    timezone: 'UTC',
    enabled: true,
  }))
  mocks.data.tasks = ['r0', 'r1'].map((id, i) => ({
    ...base,
    id: 't' + i,
    reptileRoutineId: id,
    title: 'Dust',
    type: 'custom',
    status: 'open',
    priority: 'normal',
    dueAt: due,
  }))
  const complete = vi.fn()
  render(
    <SupplementCalendar data={mocks.data} busy={false} onComplete={complete} />,
  )
  expect(screen.getAllByText(/Multiple D3-containing/)).toHaveLength(2)
  expect(screen.getAllByText(/Overdue/)).toHaveLength(2)
  expect(complete).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByText('Mark as Given')[0]!)
  expect(complete).toHaveBeenCalledWith('t0')
})
it('renders an accessible interactive weight graph and date ranges', () => {
  const events = [
    {
      ...base,
      id: 'w',
      reptileId: 'a',
      kind: 'weight' as const,
      payload: { grams: 6.8 },
      notes: '',
      occurredAt: date,
    },
  ]
  render(<WeightPanel events={events} />)
  expect(
    screen.getByRole('img', { name: 'Weight over time in grams' }),
  ).toBeInTheDocument()
  fireEvent.focus(screen.getByRole('button', { name: /6.8 grams/ }))
  expect(screen.getByRole('status')).toHaveTextContent('6.8 g')
  fireEvent.change(screen.getByLabelText('Chart range'), {
    target: { value: '30' },
  })
  expect(
    screen.getByText(/does not indicate good or poor health/),
  ).toBeInTheDocument()
})

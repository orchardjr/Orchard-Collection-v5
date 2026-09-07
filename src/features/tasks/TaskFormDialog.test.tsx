import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskFormDialog } from './TaskFormDialog'
import type { Plant, Space } from '../../models'
const now = new Date()
const plants: Plant[] = [
  {
    id: 'a',
    nickname: 'Cattleya',
    scientificName: 'Cattleya trianae',
    kind: 'plant',
    status: 'active',
    favorite: false,
    spaceId: 'room',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'b',
    nickname: 'Dendrobium',
    scientificName: 'Dendrobium anosmum',
    kind: 'plant',
    status: 'active',
    favorite: false,
    spaceId: 'room',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c',
    nickname: 'Archived fern',
    scientificName: 'Fern',
    kind: 'plant',
    status: 'archived',
    favorite: false,
    spaceId: 'room',
    createdAt: now,
    updatedAt: now,
  },
]
const spaces: Space[] = [
  {
    id: 'room',
    name: 'Orchid room',
    type: 'room',
    createdAt: now,
    updatedAt: now,
  },
]
describe('task assignment form', () => {
  it('preassigns the current plant and submits one task for selected plants in a Space', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskFormDialog
        plants={plants}
        spaces={spaces}
        plantId="a"
        onClose={vi.fn()}
        onSave={save}
      />,
    )
    expect(
      (screen.getByRole('checkbox', { name: /Cattleya/ }) as HTMLInputElement)
        .checked,
    ).toBe(true)
    expect(screen.queryByRole('checkbox', { name: /Archived fern/ })).toBeNull()
    fireEvent.change(screen.getByLabelText('Assignment space'), {
      target: { value: 'room' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Select filtered (2)' }))
    fireEvent.change(screen.getByLabelText('Task name'), {
      target: { value: 'Fertilize orchids' },
    })
    fireEvent.change(screen.getByLabelText('Task type'), {
      target: { value: 'fertilize' },
    })
    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('Repeat'), {
      target: { value: 'interval' },
    })
    fireEvent.change(screen.getByLabelText('Every X days'), {
      target: { value: '14' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(save.mock.calls[0]![0]).toMatchObject({
      title: 'Fertilize orchids',
      plantIds: ['a', 'b'],
      plantId: undefined,
      recurrence: 'interval',
      recurrenceIntervalDays: 14,
    })
  })
  it('supports search, existing tags, and explicitly including archived plants', () => {
    render(
      <TaskFormDialog
        plants={plants}
        spaces={spaces}
        plantTags={[{ plantId: 'a', name: 'Orchid' }]}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('Search plants'), {
      target: { value: 'trianae' },
    })
    expect(screen.queryByRole('checkbox', { name: /Dendrobium/ })).toBeNull()
    fireEvent.change(screen.getByLabelText('Search plants'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Assignment tag'), {
      target: { value: 'Orchid' },
    })
    expect(screen.queryByRole('checkbox', { name: /Dendrobium/ })).toBeNull()
    fireEvent.change(screen.getByLabelText('Assignment tag'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Filter plants'), {
      target: { value: 'archived' },
    })
    expect(screen.getByRole('checkbox', { name: /Archived fern/ })).toBeTruthy()
  })
  it('preserves entered values and exposes save errors for retry', async () => {
    render(
      <TaskFormDialog
        plants={plants}
        spaces={spaces}
        onClose={vi.fn()}
        onSave={vi
          .fn()
          .mockRejectedValue(new Error('Permission denied [42501]'))}
      />,
    )
    fireEvent.change(screen.getByLabelText('Task name'), {
      target: { value: 'Inspect' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Permission denied [42501]',
    )
    expect((screen.getByLabelText('Task name') as HTMLInputElement).value).toBe(
      'Inspect',
    )
  })
})

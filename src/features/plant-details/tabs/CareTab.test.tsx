import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CareTab } from './CareTab'
import type { Plant } from '../../../models'
const save = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('../../../hooks/useOrchardData', () => ({
  useCareMutation: () => ({ mutateAsync: save }),
}))
const plant: Plant = {
  id: 'p',
  nickname: 'Fern',
  scientificName: 'Fern',
  kind: 'plant',
  status: 'active',
  favorite: false,
  waterIntervalDays: 7,
  createdAt: new Date(),
  updatedAt: new Date(),
}
describe('editable care', () => {
  it('preserves the completed timestamp when only care notes change', async () => {
    const last = new Date('2026-01-01T15:37:00Z')
    render(<CareTab plant={{ ...plant, lastWateredAt: last }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit care' }))
    fireEvent.change(screen.getByLabelText('Care notes'), {
      target: { value: 'Updated note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save care' }))
    await waitFor(() =>
      expect(save.mock.calls.at(-1)![0].input.careNotes).toBe('Updated note'),
    )
    expect(save.mock.calls.at(-1)![0].input.lastWateredAt).toEqual(last)
  })
  it('saves enabled intervals, dates, notes and recurring-task choices', async () => {
    render(<CareTab plant={plant} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit care' }))
    fireEvent.change(screen.getByLabelText('Water every (days)'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Last watering date'), {
      target: { value: '2026-01-01' },
    })
    fireEvent.click(screen.getByLabelText('Create recurring watering task'))
    fireEvent.change(screen.getByLabelText('Care notes'), {
      target: { value: 'Keep moist' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save care' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect(save.mock.calls.at(-1)![0]).toMatchObject({
      id: 'p',
      input: {
        waterIntervalDays: 10,
        fertilizerIntervalDays: 0,
        waterTask: true,
        careNotes: 'Keep moist',
      },
    })
    expect(save.mock.calls.at(-1)![0].input.lastWateredAt).toEqual(
      new Date('2026-01-01T00:00:00'),
    )
  })
  it('cancels without saving and restores original form values', () => {
    save.mockClear()
    render(<CareTab plant={plant} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit care' }))
    fireEvent.change(screen.getByLabelText('Water every (days)'), {
      target: { value: '22' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Edit care' }))
    expect(
      (screen.getByLabelText('Water every (days)') as HTMLInputElement).value,
    ).toBe('7')
  })
})

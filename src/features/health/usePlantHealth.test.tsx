import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  create: vi.fn(),
  localRead: vi.fn(),
  localCreate: vi.fn(),
  local: false,
}))
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true }))
vi.mock('../../data/localCollectionMode', () => ({
  isLocalCollectionMode: () => mocks.local,
}))
vi.mock('../plants/useCollectionPrintData', () => ({
  readPrintRows: mocks.read,
}))
vi.mock('../../data/cloudRepositories', () => ({
  cloudTimelineRepository: { create: mocks.create },
}))
vi.mock('../../db/repositories/TimelineRepository', () => ({
  timelineRepository: { getAll: mocks.localRead, create: mocks.localCreate },
}))
import { usePlantHealth } from './usePlantHealth'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.local = false
  mocks.read.mockResolvedValue([])
  mocks.localRead.mockResolvedValue([])
  mocks.create.mockResolvedValue({ id: 'event' })
  mocks.localCreate.mockResolvedValue({ id: 'local-event' })
})
function setup(enabled = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return {
    ...renderHook(() => usePlantHealth(enabled), { wrapper }),
    invalidate,
  }
}
it('reads bulk timeline records, persists through the existing repository and invalidates views', async () => {
  const { result, invalidate } = setup()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(mocks.read).toHaveBeenCalledWith('timeline_events')
  await act(async () => {
    await result.current.save.mutateAsync({
      plantId: 'p',
      status: 'monitoring',
      notes: 'Spots',
    })
  })
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      plantId: 'p',
      metadata: { feature: 'plant-health-v1', healthStatus: 'monitoring' },
      isManual: true,
    }),
  )
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['timeline'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
  expect(mocks.localCreate).not.toHaveBeenCalled()
})
it('does not read when disabled and does not silently fall back when cloud reads fail', async () => {
  const disabled = setup(false)
  expect(mocks.read).not.toHaveBeenCalled()
  disabled.unmount()
  mocks.read.mockRejectedValueOnce(new Error('service unavailable'))
  const { result } = setup()
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(mocks.localRead).not.toHaveBeenCalled()
})
it('uses local reads and writes only in explicit local mode', async () => {
  mocks.local = true
  const { result } = setup()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  await act(async () => {
    await result.current.save.mutateAsync({
      plantId: 'p',
      status: 'healthy',
      notes: '',
    })
  })
  expect(mocks.localCreate).toHaveBeenCalledTimes(1)
  expect(mocks.create).not.toHaveBeenCalled()
  expect(mocks.read).not.toHaveBeenCalled()
})

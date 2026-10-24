import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ read: vi.fn(), collection: vi.fn() }))
vi.mock('./useCollectionPrintData', () => ({
  readPrintRows: mocks.read,
  useCollectionPrintData: mocks.collection,
}))
import {
  readAttentionTasks,
  useCollectionAttention,
} from './useCollectionAttention'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.read.mockResolvedValue([])
  mocks.collection.mockReturnValue({
    plants: [],
    media: [],
    tags: [],
    local: false,
    loading: false,
    error: null,
    retry: vi.fn(),
  })
})
afterEach(() => vi.useRealTimers())
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
)
describe('attention data reads', () => {
  it('reads tasks and shared assignments in bulk and preserves legacy single-plant assignments', async () => {
    mocks.read.mockImplementation(async (table: string) =>
      table === 'tasks'
        ? [
            { id: 'shared', plantId: 'legacy' },
            { id: 'single', plantId: 'c' },
          ]
        : [
            { taskId: 'shared', plantId: 'a' },
            { taskId: 'shared', plantId: 'b' },
            { taskId: 'shared', plantId: 'a' },
          ],
    )
    expect(await readAttentionTasks()).toEqual([
      { id: 'shared', plantId: 'legacy', plantIds: ['a', 'b', 'legacy'] },
      { id: 'single', plantId: 'c', plantIds: ['c'] },
    ])
    expect(mocks.read.mock.calls).toEqual([['tasks'], ['task_plants']])
  })
  it('requests metadata without thumbnail signing and surfaces task read errors', async () => {
    const error = new Error('task read failed')
    mocks.read.mockRejectedValue(error)
    const { result } = renderHook(() => useCollectionAttention(), { wrapper })
    await waitFor(() => expect(result.current.error).toBe(error))
    expect(mocks.collection).toHaveBeenCalledWith({
      enabled: true,
      thumbnails: false,
    })
  })
  it('does not fetch data or start a timer for ordinary unfiltered Collection views', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useCollectionAttention(false), {
      wrapper,
    })
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.collection).toHaveBeenCalledWith({
      enabled: false,
      thumbnails: false,
    })
    unmount()
  })
  it('refreshes at calendar rollover and cleans up its timer and focus listener', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 24, 23, 59, 30))
    const plants = [
      {
        id: 'a',
        status: 'active',
        waterIntervalDays: 7,
        lastWateredAt: new Date(2026, 9, 17),
      },
    ]
    mocks.collection.mockReturnValue({ ...mocks.collection(), plants })
    const clear = vi.spyOn(globalThis, 'clearInterval')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { result, unmount } = renderHook(() => useCollectionAttention(), {
      wrapper,
    })
    expect(result.current.attention.overdueWater.size).toBe(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(result.current.attention.overdueWater.has('a')).toBe(true)
    unmount()
    expect(clear).toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith('focus', expect.any(Function))
    clear.mockRestore()
    remove.mockRestore()
  })
})

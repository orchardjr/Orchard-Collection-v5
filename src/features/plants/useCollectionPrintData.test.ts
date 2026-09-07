import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  range: vi.fn(),
  sign: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  requireSupabase: () => ({
    from: mocks.from,
    storage: { from: () => ({ createSignedUrls: mocks.sign }) },
  }),
}))
import { readPrintMedia, readPrintRows } from './useCollectionPrintData'

describe('bulk print collection reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.range.mockReset()
    mocks.sign.mockReset()
    mocks.from.mockReturnValue({
      select: () => ({ order: () => ({ range: mocks.range }) }),
    })
  })
  it('paginates beyond the default server row limit without per-plant reads', async () => {
    const rows = Array.from({ length: 1003 }, (_, id) => ({
      id: String(id),
      resource_id: String(id),
    }))
    mocks.range.mockImplementation((start: number, end: number) =>
      Promise.resolve({ data: rows.slice(start, end + 1), error: null }),
    )
    const result = await readPrintRows<{ id: string; resourceId: string }>(
      'nfc_tags',
    )
    expect(result).toHaveLength(1003)
    expect(result[1002]!.resourceId).toBe('1002')
    expect(mocks.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ])
    expect(mocks.sign).not.toHaveBeenCalled()
  })
  it('batch-signs only thumbnails, retaining media without thumbnails for accurate counts', async () => {
    const rows = Array.from({ length: 502 }, (_, id) => ({
      id: String(id),
      plant_id: 'plant',
      storage_path: 'original/' + id,
      thumbnail_path: id < 501 ? 'thumb/' + id : null,
    }))
    mocks.range.mockImplementation((start: number, end: number) =>
      Promise.resolve({ data: rows.slice(start, end + 1) }),
    )
    mocks.sign.mockImplementation((paths: string[]) =>
      Promise.resolve({
        data: paths.map((path) => ({ path, signedUrl: 'signed/' + path })),
      }),
    )
    const assets = await readPrintMedia()
    expect(assets).toHaveLength(502)
    expect(mocks.sign).toHaveBeenCalledTimes(2)
    expect(mocks.sign.mock.calls.flatMap((call) => call[0])).toHaveLength(501)
    expect(
      mocks.sign.mock.calls
        .flatMap((call) => call[0])
        .every((path: string) => path.startsWith('thumb/')),
    ).toBe(true)
    expect(assets[0]!.thumbnailUrl).toBe('signed/thumb/0')
    expect(assets.every((asset) => !asset.signedUrl)).toBe(true)
    expect(assets[501]!.thumbnailUrl).toBeUndefined()
  })
  it('rejects incomplete metadata instead of treating failures as no assignments', async () => {
    mocks.range.mockResolvedValue({
      data: null,
      error: { message: 'unavailable', code: '503' },
    })
    await expect(readPrintRows('nfc_tags')).rejects.toThrow('unavailable')
  })
  it('rejects failed thumbnail access rather than producing a silently incomplete report', async () => {
    mocks.range.mockResolvedValue({
      data: [{ id: 'a', plant_id: 'p', thumbnail_path: 'thumb/a' }],
    })
    mocks.sign.mockResolvedValue({ error: { message: 'access failed' } })
    await expect(readPrintMedia()).rejects.toThrow('access failed')
  })
})

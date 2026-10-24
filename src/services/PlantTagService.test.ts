import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  requireSupabase: () => ({
    from: mocks.from,
    auth: { getUser: mocks.getUser },
  }),
}))
import { PlantTagService } from './PlantTagService'
const service = new PlantTagService()
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } })
})
describe('bulk plant tag assignments', () => {
  it('adds idempotent links and removes only requested owner/plant/tag links, never shared tags', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'orchid', name: 'Orchid' },
        { id: 'old', name: 'Old' },
      ],
    })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const inTags = vi.fn().mockResolvedValue({ error: null })
    const eq = vi.fn().mockReturnThis()
    const deletion = { eq, in: inTags }
    const remove = vi.fn().mockReturnValue(deletion)
    mocks.from.mockImplementation((table: string) =>
      table === 'tags'
        ? { select: () => ({ order }) }
        : { upsert, delete: remove },
    )
    const apply = await service.prepare(['Orchid', ' Orchid '], ['Old'])
    await apply('plant-a')
    expect(upsert).toHaveBeenCalledWith(
      [{ user_id: 'owner', plant_id: 'plant-a', tag_id: 'orchid' }],
      { onConflict: 'user_id,plant_id,tag_id', ignoreDuplicates: true },
    )
    expect(eq.mock.calls).toEqual([
      ['user_id', 'owner'],
      ['plant_id', 'plant-a'],
    ])
    expect(inTags).toHaveBeenCalledWith('tag_id', ['old'])
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      'tags',
      'plant_tag_links',
      'plant_tag_links',
    ])
  })
  it('creates missing names under the authenticated owner and surfaces actual link errors', async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: 'new', name: 'New' } }),
      }),
    })
    mocks.from.mockImplementation((table: string) =>
      table === 'tags'
        ? { select: () => ({ order: async () => ({ data: [] }) }), insert }
        : {
            upsert: async () => ({
              error: {
                code: '42501',
                message: 'denied',
                details: 'owner check',
                hint: 'sign in',
              },
            }),
          },
    )
    const apply = await service.prepare(['New'], [])
    expect(insert).toHaveBeenCalledWith({ user_id: 'owner', name: 'New' })
    await expect(apply('plant')).rejects.toThrow(
      '[42501] denied owner check sign in',
    )
  })
  it('does not write anything when authentication is missing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await expect(service.prepare(['Tag'], [])).rejects.toThrow('Sign in')
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

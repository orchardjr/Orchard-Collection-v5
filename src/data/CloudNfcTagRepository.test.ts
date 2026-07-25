import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireSupabaseMock } = vi.hoisted(() => ({
  requireSupabaseMock: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  requireSupabase: requireSupabaseMock,
}))

import { CloudNfcTagRepository } from './CloudNfcTagRepository'

describe('CloudNfcTagRepository', () => {
  beforeEach(() => {
    requireSupabaseMock.mockReset()
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('creates a cloud tag with an owner and permanent UUID token', async () => {
    const inserted: Array<Record<string, unknown>> = []
    const ownerId = '5dbaf50b-77f5-4387-b38f-748c3dc34832'
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ownerId } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        insert: vi.fn((row: Record<string, unknown>) => {
          inserted.push(row)
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  ...row,
                  id: '9ce634a6-f10f-4bcb-8095-ddaf4ebf9acc',
                  created_at: '2026-07-25T12:00:00.000Z',
                  updated_at: '2026-07-25T12:00:00.000Z',
                },
                error: null,
              }),
            })),
          }
        }),
      })),
    }
    requireSupabaseMock.mockReturnValue(client)

    const repository = new CloudNfcTagRepository()
    const tag = await repository.assignTag({
      resourceType: 'plant',
      resourceId: 'ec6713ae-a301-43ee-a447-29cd48c33f24',
      nickname: 'Monstera tag',
    })

    expect(inserted[0]).toMatchObject({
      user_id: ownerId,
      resource_type: 'plant',
      resource_id: 'ec6713ae-a301-43ee-a447-29cd48c33f24',
    })
    expect(tag.publicToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})

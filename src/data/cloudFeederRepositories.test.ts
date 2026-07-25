import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireSupabaseMock } = vi.hoisted(() => ({
  requireSupabaseMock: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  requireSupabase: requireSupabaseMock,
}))

import { CloudFeederColonyRepository } from './cloudFeederRepositories'

describe('CloudFeederColonyRepository', () => {
  beforeEach(() => {
    requireSupabaseMock.mockReset()
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('resolves an imported Dexie species ID before creating a colony', async () => {
    const insertedRows: Array<Record<string, unknown>> = []
    const cloudSpeciesId = '10f75448-37bc-4c6a-82ed-d659cedb1634'
    const ownerId = 'd18f989a-29f7-4698-aead-65e58a728e63'
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ownerId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'feeder_species')
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: cloudSpeciesId },
                  error: null,
                }),
              })),
            })),
          }
        return {
          insert: vi.fn((row: Record<string, unknown>) => {
            insertedRows.push(row)
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...row,
                    id: '78b08613-537d-43c0-82a4-13b5ce2de6a5',
                    created_at: '2026-07-24T12:00:00.000Z',
                    updated_at: '2026-07-24T12:00:00.000Z',
                  },
                  error: null,
                }),
              })),
            }
          }),
        }
      }),
    }
    requireSupabaseMock.mockReturnValue(client)

    const repository = new CloudFeederColonyRepository()
    const colony = await repository.create({
      colonyId: 'DR-B-001',
      name: 'Primary discoid colony',
      speciesId: 'feeder-species-1',
      type: 'discoid-breeder',
      status: 'active',
      dateStarted: new Date('2026-07-24T00:00:00.000Z'),
      binId: 'BIN-1',
      location: 'Feeder room',
      estimatedPopulation: 250,
      notes: 'Healthy breeder colony.',
      qrValue: 'orchard:colony:DR-B-001',
    })

    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toMatchObject({
      user_id: ownerId,
      species_id: cloudSpeciesId,
    })
    expect(colony.speciesId).toBe(cloudSpeciesId)
  })
})

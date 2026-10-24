import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  urls: vi.fn(),
  single: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  requireSupabase: () => ({
    from: mocks.from,
    auth: { getUser: mocks.getUser },
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        createSignedUrls: mocks.urls,
      }),
    },
  }),
}))
import { CloudMediaRepository } from './CloudMediaRepository'
import { SavedMediaWarning } from './SavedMediaWarning'
const repository = new CloudMediaRepository()
afterEach(() => vi.restoreAllMocks())
const input = {
  plantId: 'plant',
  fileName: 'photo.jpg',
  mimeType: 'image/jpeg',
  fileSize: 5,
  blob: new Blob(['photo']),
  thumbnailBlob: new Blob(['thumb']),
  uploadedAt: new Date(),
  fingerprint: 'fingerprint',
  isHero: true,
  isFavorite: false,
  tags: [],
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.single.mockResolvedValue({
    data: {
      id: 'saved',
      plant_id: 'plant',
      storage_path: 'original',
      thumbnail_path: 'thumbnail',
    },
  })
  mocks.from.mockReturnValue({
    insert: () => ({ select: () => ({ single: mocks.single }) }),
  })
  mocks.urls.mockResolvedValue({
    data: [{ path: 'original', signedUrl: 'signed' }],
    error: null,
  })
})
describe('cloud upload outcomes', () => {
  it('checks existing photo metadata without requiring signed URL access', async () => {
    const eq = vi.fn().mockReturnValue({
      order: async () => ({
        data: [{ id: 'old', plant_id: 'plant', storage_path: 'original' }],
      }),
    })
    mocks.from.mockReturnValue({ select: () => ({ eq }) })
    mocks.urls.mockRejectedValue(new Error('preview unavailable'))
    expect(await repository.getByPlantId('plant', true)).toEqual([
      { id: 'old', plantId: 'plant', storagePath: 'original' },
    ])
    expect(mocks.urls).not.toHaveBeenCalled()
  })
  it('keeps committed Storage files when only preview URL creation fails', async () => {
    mocks.urls.mockResolvedValue({ error: { message: 'preview unavailable' } })
    const error = await repository
      .create(input)
      .catch((error: unknown) => error)
    expect(error).toBeInstanceOf(SavedMediaWarning)
    expect((error as SavedMediaWarning).asset).toMatchObject({
      id: 'saved',
      plantId: 'plant',
    })
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.upload).toHaveBeenCalledTimes(2)
  })
  it('cleans up Storage objects if the database insert is rejected and retains the real error', async () => {
    mocks.single.mockResolvedValue({
      error: {
        code: '23503',
        message: 'missing plant',
        details: 'foreign key',
        hint: 'check id',
      },
    })
    const logging = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    await expect(repository.create(input)).rejects.toThrow('Code: 23503')
    expect(mocks.remove.mock.calls[0]?.[0]).toHaveLength(2)
    logging.mockRestore()
  })
  it('does not remove objects when the original upload never succeeded', async () => {
    mocks.upload.mockResolvedValue({
      error: { message: 'offline', code: '503' },
    })
    const logging = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    await expect(repository.create(input)).rejects.toThrow(
      'Storage original upload',
    )
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.single).not.toHaveBeenCalled()
    logging.mockRestore()
  })
  it('scopes plant-gallery reads and duplicate checks instead of loading every photo', async () => {
    const eq = vi.fn().mockReturnValue({
      order: async () => ({ data: [] }),
      limit: () => ({
        maybeSingle: async () => ({
          data: { id: 'duplicate', fingerprint: 'fingerprint' },
        }),
      }),
    })
    mocks.from.mockReturnValue({ select: () => ({ eq }) })
    expect(await repository.getByPlantId('plant')).toEqual([])
    expect(await repository.getByFingerprint('fingerprint')).toMatchObject({
      id: 'duplicate',
    })
    expect(eq.mock.calls).toEqual([
      ['plant_id', 'plant'],
      ['fingerprint', 'fingerprint'],
    ])
    expect(mocks.urls).not.toHaveBeenCalled()
  })
})

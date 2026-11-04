import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
  readRows: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
  getUser: vi.fn(),
  prepare: vi.fn(),
}))
vi.mock('../../data/SupabaseRepository', () => ({
  SupabaseRepository: class {
    getById = mocks.getById
    update = mocks.update
    delete = mocks.delete
    create = mocks.create
  },
  repositoryError: (operation: string, error: unknown) =>
    new Error(operation, { cause: error }),
}))
vi.mock('../plants/useCollectionPrintData', () => ({
  readPrintRows: mocks.readRows,
}))
vi.mock('../media/mediaProcessing', () => ({ prepareMediaFile: mocks.prepare }))
vi.mock('../../lib/supabase', () => ({
  requireSupabase: () => ({
    auth: { getUser: mocks.getUser },
    storage: {
      from: () => ({
        list: mocks.list,
        remove: mocks.remove,
        upload: mocks.upload,
      }),
    },
  }),
}))
import { deleteReptile, uploadReptilePhoto } from './reptileService'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getById.mockResolvedValue({ id: 'animal' })
  mocks.update.mockResolvedValue({})
  mocks.delete.mockResolvedValue(undefined)
  mocks.readRows.mockResolvedValue([])
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'owner' } },
    error: null,
  })
  mocks.list.mockResolvedValue({ data: [], error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.prepare.mockResolvedValue({})
})
it('removes owner-scoped orphan files before the reptile database row', async () => {
  mocks.list
    .mockResolvedValueOnce({ data: [{ name: 'photo', id: null }], error: null })
    .mockResolvedValueOnce({
      data: [{ name: 'original', id: 'object' }],
      error: null,
    })
  await deleteReptile('animal')
  expect(mocks.update).toHaveBeenCalledWith('animal', {
    deleting: true,
    status: 'archived',
  })
  expect(mocks.list.mock.calls[0]![0]).toBe('owner/reptiles/animal')
  expect(mocks.remove).toHaveBeenCalledWith([
    'owner/reptiles/animal/photo/original',
  ])
  expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.delete.mock.invocationCallOrder[0]!,
  )
})
it('retains the archived row when Storage cleanup fails', async () => {
  mocks.list.mockResolvedValue({
    data: [{ name: 'original', id: 'object' }],
    error: null,
  })
  mocks.remove.mockResolvedValue({ error: { message: 'Service unavailable' } })
  await expect(deleteReptile('animal')).rejects.toThrow('Photo cleanup failed')
  expect(mocks.delete).not.toHaveBeenCalled()
})
it('stops deletion if Storage cannot enumerate all files', async () => {
  mocks.list.mockResolvedValue({
    data: null,
    error: { message: 'Unavailable' },
  })
  await expect(deleteReptile('animal')).rejects.toThrow('Could not verify')
  expect(mocks.remove).not.toHaveBeenCalled()
  expect(mocks.delete).not.toHaveBeenCalled()
})
it('does not remove a photo after an ambiguous database save response', async () => {
  mocks.create.mockRejectedValue(new Error('Network response lost'))
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await expect(
      uploadReptilePhoto(
        'animal',
        new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      ),
    ).rejects.toThrow('Network response lost')
    expect(mocks.upload.mock.calls[0]![0]).toMatch(
      /^owner\/reptiles\/animal\/.+\/original$/,
    )
    expect(mocks.remove).not.toHaveBeenCalled()
  } finally {
    log.mockRestore()
  }
})

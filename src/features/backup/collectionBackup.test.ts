import { describe, expect, it, vi } from 'vitest'
const download = vi.hoisted(() => vi.fn())
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  requireSupabase: () => ({ storage: { from: () => ({ download }) } }),
}))
import {
  backupDocument,
  plantsCsv,
  scopeBackup,
  type BackupTables,
} from './collectionBackup'

function fixture(): BackupTables {
  return {
    plants: [
      {
        id: 'a',
        status: 'active',
        nickname: '=SUM(1)',
        notes: 'line\n"quoted"',
        spaceId: 's',
      },
      { id: 'b', status: 'archived', nickname: 'Archived' },
    ],
    tasks: [{ id: 't' }, { id: 'other', plantId: 'b' }],
    task_plants: [
      { taskId: 't', plantId: 'a' },
      { taskId: 't', plantId: 'b' },
    ],
    spaces: [{ id: 's', name: 'Window' }],
    tags: [{ id: 'tag', name: 'Orchids' }],
    plant_tag_links: [{ plantId: 'a', tagId: 'tag' }],
    plant_media: [
      {
        id: 'm',
        plantId: 'a',
        blob: new Blob(['photo']),
        signedUrl: 'private-url',
      },
    ],
    nfc_tags: [
      { resourceType: 'plant', resourceId: 'a', uid: 'code' },
      { resourceType: 'feeder', resourceId: 'a' },
    ],
    timeline_events: [{ plantId: 'a' }, { plantId: 'b' }],
    plant_properties: [],
    label_templates: [],
  }
}
describe('collection backup', () => {
  it('scopes plants and dependent records, retaining shared task assignments', () => {
    const result = scopeBackup(fixture(), 'active')
    expect(result.plants.map((p) => p.id)).toEqual(['a'])
    expect(result.tasks.map((t) => t.id)).toEqual(['t'])
    expect(result.task_plants).toHaveLength(2)
    expect(result.timeline_events).toHaveLength(1)
    expect(result.nfc_tags).toHaveLength(1)
    expect(scopeBackup(fixture(), 'archived').plants.map((p) => p.id)).toEqual([
      'b',
    ])
    expect(scopeBackup(fixture(), 'all').plants).toHaveLength(2)
  })
  it('escapes spreadsheet formulas, quotes, newlines and includes location/tags', () => {
    const csv = plantsCsv(fixture())
    expect(csv).toContain('"\'=SUM(1)"')
    expect(csv).toContain('"line\n""quoted"""')
    expect(csv).toContain('"Window","Orchids"')
  })
  it('exports versioned metadata without blobs or temporary URLs', async () => {
    const result = JSON.parse(
      await backupDocument(fixture(), true, 'all', false, vi.fn()),
    )
    expect(result.version).toBe(1)
    expect(result.plantCount).toBe(2)
    expect(result.files).toEqual([])
    expect(result.tables.plant_media[0].blob).toBeUndefined()
    expect(result.tables.plant_media[0].signedUrl).toBeUndefined()
    expect(result.tables.nfc_tags[0].uid).toBe('code')
  })
  it('embeds originals and reports progress without modifying source rows', async () => {
    const tables = fixture()
    const progress = vi.fn()
    const result = JSON.parse(
      await backupDocument(tables, true, 'all', true, progress),
    )
    expect(result.files[0].dataUrl).toContain('cGhvdG8=')
    expect(progress).toHaveBeenCalledWith('Reading photo 1 of 1')
    expect(tables.plant_media[0]!.blob).toBeInstanceOf(Blob)
  })
  it('rejects missing originals instead of producing an incomplete backup', async () => {
    const tables = fixture()
    delete tables.plant_media[0]!.blob
    await expect(
      backupDocument(tables, true, 'all', true, vi.fn()),
    ).rejects.toThrow('missing its original')
  })
  it('downloads cloud originals through authenticated Storage and rejects failures', async () => {
    const tables = fixture()
    tables.plant_media = [
      { id: 'm', plantId: 'a', storagePath: 'owner/a/original.jpg' },
    ]
    download.mockResolvedValueOnce({ data: new Blob(['cloud']), error: null })
    const result = JSON.parse(
      await backupDocument(tables, false, 'all', true, vi.fn()),
    )
    expect(download).toHaveBeenCalledWith('owner/a/original.jpg')
    expect(result.files).toHaveLength(1)
    download.mockResolvedValueOnce({
      data: null,
      error: { message: 'Access denied' },
    })
    await expect(
      backupDocument(tables, false, 'all', true, vi.fn()),
    ).rejects.toThrow('No backup was downloaded')
  })
  it('rejects photos above the memory safety limit', async () => {
    const tables = fixture()
    const blob = new Blob(['small'])
    Object.defineProperty(blob, 'size', { value: 51 * 1024 * 1024 })
    tables.plant_media[0]!.blob = blob
    await expect(
      backupDocument(tables, true, 'all', true, vi.fn()),
    ).rejects.toThrow('50 MB')
  })
})

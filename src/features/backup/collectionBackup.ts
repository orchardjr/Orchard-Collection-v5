import { db } from '../../db/database'
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'
import { isLocalCollectionMode } from '../../data/localCollectionMode'
import { readPrintRows } from '../plants/useCollectionPrintData'
import {
  filterCollectionPlants,
  type PlantStatusFilter,
} from '../plants/plantFilters'
import type { Plant } from '../../models'

type Row = Record<string, unknown>
export type BackupTables = Record<
  | 'plants'
  | 'spaces'
  | 'tasks'
  | 'task_plants'
  | 'plant_media'
  | 'timeline_events'
  | 'plant_properties'
  | 'tags'
  | 'plant_tag_links'
  | 'nfc_tags'
  | 'label_templates',
  Row[]
>
export const photoLimit = 50 * 1024 * 1024

export function scopeBackup(
  tables: BackupTables,
  scope: PlantStatusFilter,
): BackupTables {
  const plants = filterCollectionPlants(
    tables.plants as unknown as Plant[],
    scope,
    '',
  )
  const ids = new Set(plants.map((p) => p.id))
  const assigned = new Set(
    tables.task_plants
      .filter((r) => ids.has(String(r.plantId)))
      .map((r) => r.taskId),
  )
  const tasks = tables.tasks.filter(
    (r) =>
      scope === 'all' ||
      ids.has(String(r.plantId)) ||
      assigned.has(r.id) ||
      (r.plantIds as string[] | undefined)?.some((id) => ids.has(id)),
  )
  const taskIds = new Set(tasks.map((r) => r.id))
  return {
    ...tables,
    plants: plants as unknown as Row[],
    tasks,
    // Retain all assignments on included shared tasks, even outside the selected scope.
    task_plants: tables.task_plants.filter((r) => taskIds.has(r.taskId)),
    plant_media: tables.plant_media.filter((r) => ids.has(String(r.plantId))),
    timeline_events: tables.timeline_events.filter((r) =>
      ids.has(String(r.plantId)),
    ),
    plant_properties: tables.plant_properties.filter((r) =>
      ids.has(String(r.plantId)),
    ),
    plant_tag_links: tables.plant_tag_links.filter((r) =>
      ids.has(String(r.plantId)),
    ),
    nfc_tags: tables.nfc_tags.filter(
      (r) => r.resourceType === 'plant' && ids.has(String(r.resourceId)),
    ),
  }
}

export function plantsCsv(tables: BackupTables) {
  const spaces = new Map(tables.spaces.map((r) => [r.id, r.name]))
  const tags = new Map(tables.tags.map((r) => [r.id, r.name]))
  const fields = [
    'id',
    'nickname',
    'commonName',
    'scientificName',
    'cultivar',
    'status',
    'purchaseDate',
    'vendor',
    'notes',
    'careNotes',
    'waterIntervalDays',
    'fertilizerIntervalDays',
    'lastWateredAt',
    'lastFertilizedAt',
    'mounted',
    'mossPole',
    'createdAt',
  ]
  const cell = (value: unknown) => {
    let text = value instanceof Date ? value.toISOString() : String(value ?? '')
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text
    return '"' + text.replaceAll('"', '""') + '"'
  }
  return (
    '\uFEFF' +
    [
      fields.concat(['location', 'tags']),
      ...tables.plants.map((p) => [
        ...fields.map((f) => p[f]),
        spaces.get(p.spaceId),
        tables.plant_tag_links
          .filter((r) => r.plantId === p.id)
          .map((r) => tags.get(r.tagId))
          .join('; '),
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  )
}

export async function readBackupTables(): Promise<{
  local: boolean
  tables: BackupTables
}> {
  const local = !isSupabaseConfigured || isLocalCollectionMode()
  const names: (keyof BackupTables)[] = [
    'plants',
    'spaces',
    'tasks',
    'task_plants',
    'plant_media',
    'timeline_events',
    'plant_properties',
    'tags',
    'plant_tag_links',
    'nfc_tags',
    'label_templates',
  ]
  const localNames: Record<string, string> = {
    plants: 'plants',
    spaces: 'spaces',
    tasks: 'tasks',
    plant_media: 'media',
    timeline_events: 'timeline',
    nfc_tags: 'nfcTags',
    label_templates: 'labelTemplates',
  }
  const tables: BackupTables = {
    plants: [],
    spaces: [],
    tasks: [],
    task_plants: [],
    plant_media: [],
    timeline_events: [],
    plant_properties: [],
    tags: [],
    plant_tag_links: [],
    nfc_tags: [],
    label_templates: [],
  }
  for (const name of names) {
    if (local)
      tables[name] = localNames[name]
        ? await db.table(localNames[name]).toArray()
        : []
    else if (name === 'task_plants') {
      // Composite key ordering is required: this table has no id column.
      const rows: Row[] = []
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await requireSupabase()
          .from(name)
          .select('*')
          .order('task_id')
          .order('plant_id')
          .range(offset, offset + 499)
        if (error)
          throw new Error(
            'Could not read task assignments. No backup was downloaded.',
          )
        rows.push(
          ...(data ?? []).map((r) => ({
            userId: r.user_id,
            taskId: r.task_id,
            plantId: r.plant_id,
          })),
        )
        if ((data?.length ?? 0) < 500) break
      }
      tables[name] = rows
    } else tables[name] = await readPrintRows<Row>(name)
  }
  return { local, tables }
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(new Error('Could not read a photo. No backup was downloaded.'))
    reader.readAsDataURL(blob)
  })
}

export async function backupDocument(
  tables: BackupTables,
  local: boolean,
  scope: PlantStatusFilter,
  photos: boolean,
  progress: (value: string) => void,
) {
  const files: { mediaId: unknown; kind: string; dataUrl: string }[] = []
  let bytes = 0
  if (photos) {
    for (const [index, media] of tables.plant_media.entries()) {
      progress(`Reading photo ${index + 1} of ${tables.plant_media.length}`)
      for (const [kind, blobKey, pathKey] of [
        ['original', 'blob', 'storagePath'],
        ['thumbnail', 'thumbnailBlob', 'thumbnailPath'],
      ] as const) {
        let blob = media[blobKey] as Blob | undefined
        if (!local && media[pathKey]) {
          const { data, error } = await requireSupabase()
            .storage.from('plant-media')
            .download(String(media[pathKey]))
          if (error || !data)
            throw new Error(
              `Could not download photo ${index + 1}. No backup was downloaded. Retry or export without photos.`,
            )
          blob = data
        }
        if (!blob && kind === 'original')
          throw new Error(
            `Photo ${index + 1} is missing its original file. Export without photos or repair it first.`,
          )
        if (!blob) continue
        bytes += blob.size
        if (bytes > photoLimit)
          throw new Error(
            'Photos exceed the 50 MB backup limit. Choose a smaller status scope or export without photos.',
          )
        files.push({ mediaId: media.id, kind, dataUrl: await dataUrl(blob) })
      }
    }
  }
  return JSON.stringify(
    {
      format: 'orchard-collection-backup',
      version: 1,
      generatedAt: new Date().toISOString(),
      source: local ? 'local' : 'cloud',
      scope,
      plantCount: tables.plants.length,
      photosIncluded: photos,
      notes:
        'Read-only collection export, not a database snapshot. Shared task assignments may reference plants outside this scope. Spaces, tags and templates are retained as reference catalogs. No automatic restore is provided.',
      tables,
      files,
    },
    (key, value) =>
      ['blob', 'thumbnailBlob', 'signedUrl', 'thumbnailUrl'].includes(key)
        ? undefined
        : value,
    2,
  )
}

export function downloadBackup(content: string, extension: 'csv' | 'json') {
  const url = URL.createObjectURL(
    new Blob([content], {
      type: extension === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `orchard-collection-${new Date().toISOString().replaceAll(':', '-')}.${extension}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

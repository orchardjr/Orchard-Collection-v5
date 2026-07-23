import type { Table } from 'dexie'

import { db } from '../db/database'
import { requireSupabase } from '../lib/supabase'
import type { BaseRecord, MediaAsset, Plant } from '../models'
import { toSupabaseRow } from '../data/SupabaseRepository'

export interface LegacyCounts {
  plants: number
  spaces: number
  tasks: number
  timeline: number
  photos: number
  feederRecords: number
}

export interface ImportProgress {
  completed: number
  total: number
  label: string
}

type ProgressCallback = (progress: ImportProgress) => void

const bucket = 'plant-media'
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const relationshipKeys = new Set([
  'plantId',
  'spaceId',
  'parentSpaceId',
  'heroMediaId',
  'recurrenceSourceId',
  'speciesId',
  'parentColonyId',
  'sourceColonyId',
  'sourceBatchId',
  'inventoryId',
  'colonyId',
  'batchId',
  'animalId',
])

const recordTables = [
  ['spaces', 'spaces'],
  ['plants', 'plants'],
  ['tasks', 'tasks'],
  ['timeline', 'timeline_events'],
  ['feederSpecies', 'feeder_species'],
  ['feederColonies', 'feeder_colonies'],
  ['cricketBatches', 'cricket_batches'],
  ['feederInventory', 'feeder_inventory'],
  ['inventoryTransactions', 'inventory_transactions'],
  ['maintenanceLogs', 'maintenance_logs'],
  ['harvestLogs', 'harvest_logs'],
  ['feedingLogs', 'feeding_logs'],
  ['feederSettings', 'feeder_settings'],
] as const

async function ownerId() {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user) throw new Error('Sign in again before importing.')
  return data.user.id
}

export async function getLegacyCounts(): Promise<LegacyCounts> {
  const [plants, spaces, tasks, timeline, photos, ...feederCounts] =
    await Promise.all([
      db.plants.count(),
      db.spaces.count(),
      db.tasks.count(),
      db.timeline.count(),
      db.media.count(),
      db.feederSpecies.count(),
      db.feederColonies.count(),
      db.cricketBatches.count(),
      db.feederInventory.count(),
      db.inventoryTransactions.count(),
      db.maintenanceLogs.count(),
      db.harvestLogs.count(),
      db.feedingLogs.count(),
      db.feederSettings.count(),
    ])
  return {
    plants,
    spaces,
    tasks,
    timeline,
    photos,
    feederRecords: feederCounts.reduce((sum, count) => sum + count, 0),
  }
}

export function hasLegacyData(counts: LegacyCounts) {
  return Object.values(counts).some((count) => count > 0)
}

async function fingerprint() {
  const ids = (
    await Promise.all([
      ...recordTables.map(([dexieTable]) =>
        (db[dexieTable] as Table<BaseRecord, string>)
          .toCollection()
          .primaryKeys(),
      ),
      db.media.toCollection().primaryKeys(),
    ])
  )
    .flat()
    .sort()
  const bytes = new TextEncoder().encode(`v7:${ids.join(':')}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function isLegacyImportComplete() {
  const sourceFingerprint = await fingerprint()
  const { data, error } = await requireSupabase()
    .from('local_imports')
    .select('status')
    .eq('source_fingerprint', sourceFingerprint)
    .maybeSingle()
  if (error) throw new Error('Import status could not be checked. Retry.')
  return data?.status === 'complete'
}

export function legacyUuid(userId: string, value: string) {
  if (uuidPattern.test(value)) return value
  const parts = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
  for (const character of `${userId}:${value}`)
    for (let index = 0; index < parts.length; index++)
      parts[index] = Math.imul(
        (parts[index] ?? 0) ^ character.charCodeAt(0),
        [0x01000193, 0x27d4eb2f, 0x165667b1, 0x85ebca6b][index] ?? 1,
      )
  const hex = parts
    .map((part) => (part >>> 0).toString(16).padStart(8, '0'))
    .join('')
    .split('')
  hex[12] = '5'
  hex[16] = ['8', '9', 'a', 'b'][Number.parseInt(hex[16] ?? '0', 16) % 4]!
  const result = hex.join('')
  return `${result.slice(0, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}-${result.slice(16, 20)}-${result.slice(20)}`
}

type IdOverrides = Map<string, string>

function cloudId(userId: string, value: string, overrides: IdOverrides) {
  return overrides.get(value) ?? legacyUuid(userId, value)
}

async function referenceOverrides(): Promise<IdOverrides> {
  const overrides: IdOverrides = new Map()
  const [localSpecies, localSettings, speciesResult, settingsResult] =
    await Promise.all([
      db.feederSpecies.toArray(),
      db.feederSettings.toArray(),
      requireSupabase().from('feeder_species').select('id,name'),
      requireSupabase().from('feeder_settings').select('id,key'),
    ])
  if (speciesResult.error || settingsResult.error)
    throw new Error('Cloud feeder reference data could not be reconciled.')
  const speciesByName = new Map(
    (speciesResult.data ?? []).map((row) => [row.name, row.id]),
  )
  const settingsByKey = new Map(
    (settingsResult.data ?? []).map((row) => [row.key, row.id]),
  )
  for (const record of localSpecies) {
    const id = speciesByName.get(record.name)
    if (id) overrides.set(record.id, id)
  }
  for (const record of localSettings) {
    const id = settingsByKey.get(record.key)
    if (id) overrides.set(record.id, id)
  }
  return overrides
}

function importRow(record: BaseRecord, userId: string, overrides: IdOverrides) {
  const remapped = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      relationshipKeys.has(key) && typeof value === 'string'
        ? cloudId(userId, value, overrides)
        : value,
    ]),
  )
  return {
    ...toSupabaseRow(remapped),
    id: cloudId(userId, record.id, overrides),
    user_id: userId,
    legacy_id: record.id,
  }
}

async function upsertRecords(
  dexieTable: (typeof recordTables)[number][0],
  cloudTable: string,
  userId: string,
  overrides: IdOverrides,
) {
  const records = await (db[dexieTable] as Table<BaseRecord, string>).toArray()
  if (!records.length) return 0
  const rows = records.map((record) => {
    const row: Record<string, unknown> = importRow(record, userId, overrides)
    if (cloudTable === 'plants') delete row.hero_media_id
    return row
  })
  const { error } = await requireSupabase()
    .from(cloudTable)
    .upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`${cloudTable} import failed.`)
  return rows.length
}

async function uploadMedia(
  asset: MediaAsset,
  userId: string,
  overrides: IdOverrides,
) {
  if (!asset.blob)
    throw new Error(`${asset.fileName}: original file is missing.`)
  const client = requireSupabase()
  const safeName = asset.fileName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const base = `${userId}/${cloudId(userId, asset.plantId, overrides)}/${cloudId(userId, asset.id, overrides)}`
  const storagePath = `${base}/${safeName}`
  const thumbnailPath = asset.thumbnailBlob
    ? `${base}/thumbnail.webp`
    : undefined
  const original = await client.storage
    .from(bucket)
    .upload(storagePath, asset.blob, {
      contentType: asset.mimeType,
      upsert: true,
    })
  if (original.error) throw new Error(`${asset.fileName}: upload failed.`)
  if (asset.thumbnailBlob && thumbnailPath) {
    const thumbnail = await client.storage
      .from(bucket)
      .upload(thumbnailPath, asset.thumbnailBlob, {
        contentType: asset.thumbnailBlob.type || 'image/webp',
        upsert: true,
      })
    if (thumbnail.error) throw new Error(`${asset.fileName}: thumbnail failed.`)
  }
  const row = {
    ...importRow(asset, userId, overrides),
    storage_path: storagePath,
    thumbnail_path: thumbnailPath ?? null,
  }
  const { error } = await client
    .from('plant_media')
    .upsert(row, { onConflict: 'id' })
  if (error) throw new Error(`${asset.fileName}: metadata import failed.`)
}

async function restoreHeroReferences(
  plants: Plant[],
  userId: string,
  overrides: IdOverrides,
) {
  const client = requireSupabase()
  for (const plant of plants) {
    if (!plant.heroMediaId) continue
    const { error } = await client.rpc('set_plant_media_hero', {
      target_plant_id: cloudId(userId, plant.id, overrides),
      target_media_id: cloudId(userId, plant.heroMediaId, overrides),
    })
    if (error) throw new Error(`${plant.nickname}: hero image import failed.`)
  }
}

async function verifyImportedRows(
  media: MediaAsset[],
  userId: string,
  overrides: IdOverrides,
) {
  const client = requireSupabase()
  for (const [dexieTable, cloudTable] of recordTables) {
    const ids = await (db[dexieTable] as Table<BaseRecord, string>)
      .toCollection()
      .primaryKeys()
    if (!ids.length) continue
    const { count, error } = await client
      .from(cloudTable)
      .select('*', { count: 'exact', head: true })
      .in(
        'id',
        ids.map((id) => cloudId(userId, id, overrides)),
      )
    if (error || count !== ids.length)
      throw new Error(`${cloudTable}: imported row count did not match.`)
  }
  if (media.length) {
    const { count, error } = await client
      .from('plant_media')
      .select('*', { count: 'exact', head: true })
      .in(
        'id',
        media.map((asset) => cloudId(userId, asset.id, overrides)),
      )
    if (error || count !== media.length)
      throw new Error('Photos: imported row count did not match.')
  }
}

export async function importLegacyData(onProgress: ProgressCallback) {
  const userId = await ownerId()
  const sourceFingerprint = await fingerprint()
  const overrides = await referenceOverrides()
  const counts = await getLegacyCounts()
  const media = await db.media.toArray()
  const total = recordTables.length + media.length + 1
  const errors: string[] = []
  let completed = 0
  const report = (label: string) =>
    onProgress({ completed: ++completed, total, label })

  const client = requireSupabase()
  const importState = await client.from('local_imports').upsert(
    {
      user_id: userId,
      source_fingerprint: sourceFingerprint,
      status: 'running',
      counts,
      progress: { completed: 0, total },
      errors: [],
    },
    { onConflict: 'user_id,source_fingerprint' },
  )
  if (importState.error)
    throw new Error('Import progress could not be initialized. Retry safely.')

  for (const [dexieTable, cloudTable] of recordTables) {
    try {
      await upsertRecords(dexieTable, cloudTable, userId, overrides)
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `${cloudTable} failed.`,
      )
    }
    report(cloudTable)
  }
  for (const asset of media) {
    try {
      await uploadMedia(asset, userId, overrides)
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : 'Photo upload failed.',
      )
    }
    report(asset.fileName)
  }
  try {
    await restoreHeroReferences(await db.plants.toArray(), userId, overrides)
    await verifyImportedRows(media, userId, overrides)
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : 'Hero restoration failed.',
    )
  }
  report('Verification')

  const status = errors.length ? 'partial' : 'complete'
  const { error } = await client
    .from('local_imports')
    .update({
      status,
      progress: { completed, total },
      errors,
      verified_at: errors.length ? null : new Date().toISOString(),
    })
    .eq('source_fingerprint', sourceFingerprint)
  if (error) throw new Error('Import result could not be saved. Retry safely.')
  return { status, errors, counts }
}

export async function deleteLegacyDatabase() {
  await db.delete()
}

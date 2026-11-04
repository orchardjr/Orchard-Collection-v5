import { requireSupabase } from '../../lib/supabase'
import {
  SupabaseRepository,
  repositoryError,
} from '../../data/SupabaseRepository'
import { readPrintRows } from '../plants/useCollectionPrintData'
import { prepareMediaFile } from '../media/mediaProcessing'
import type { Task } from '../../models'
import type {
  Reptile,
  ReptileEvent,
  Supplement,
  Routine,
  ReptileMedia,
  ReptileData,
} from './types'
export const reptilesRepo = new SupabaseRepository<Reptile>('reptiles')
export const eventsRepo = new SupabaseRepository<ReptileEvent>('reptile_events')
export const supplementsRepo = new SupabaseRepository<Supplement>(
  'reptile_supplements',
)
export const routinesRepo = new SupabaseRepository<Routine>('reptile_routines')
export const reptileMediaRepo = new SupabaseRepository<ReptileMedia>(
  'reptile_media',
)
export async function readReptiles(): Promise<ReptileData> {
  const [reptiles, events, supplements, routines, media, tasks] =
    await Promise.all([
      readPrintRows<Reptile>('reptiles'),
      readPrintRows<ReptileEvent>('reptile_events'),
      readPrintRows<Supplement>('reptile_supplements'),
      readPrintRows<Routine>('reptile_routines'),
      readPrintRows<ReptileMedia>('reptile_media'),
      readPrintRows<Task>('tasks'),
    ])
  const paths = media.map((m) => m.thumbnailPath || m.storagePath)
  const urls = new Map<string, string>()
  for (let start = 0; start < paths.length; start += 100) {
    const { data, error } = await requireSupabase()
      .storage.from('plant-media')
      .createSignedUrls(paths.slice(start, start + 100), 3600)
    if (error) throw repositoryError('reptile photo access', error)
    for (const row of data ?? [])
      if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl)
  }
  return {
    reptiles,
    events,
    supplements,
    routines,
    media: media.map((m) => ({
      ...m,
      url: urls.get(m.thumbnailPath || m.storagePath),
    })),
    tasks: tasks.filter((t) => t.reptileRoutineId),
  }
}
export async function uploadReptilePhoto(
  reptileId: string,
  file: File,
  eventId?: string,
) {
  const client = requireSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in to upload photos.')
  const prepared = await prepareMediaFile(file, reptileId, false)
  const base = `${auth.user.id}/reptiles/${reptileId}/${crypto.randomUUID()}`
  const storagePath = base + '/original'
  const thumbnailPath = prepared.thumbnailBlob
    ? base + '/thumbnail.webp'
    : undefined
  const uploaded: string[] = []
  let inserting = false
  try {
    for (const [path, blob] of [
      [storagePath, file],
      [thumbnailPath, prepared.thumbnailBlob],
    ] as const) {
      if (!path || !blob) continue
      const { error } = await client.storage
        .from('plant-media')
        .upload(path, blob, { contentType: blob.type })
      if (error) throw repositoryError('photo upload', error)
      uploaded.push(path)
    }
    inserting = true
    return await reptileMediaRepo.create({
      reptileId,
      eventId,
      fileName: file.name,
      storagePath,
      thumbnailPath,
      isProfile: false,
    })
  } catch (error) {
    const underlying =
      error instanceof Error
        ? (error.cause as { code?: string } | undefined)
        : undefined
    if (!inserting || underlying?.code?.match(/^(22|23|42|P0)/)) {
      const cleanup = await client.storage.from('plant-media').remove(uploaded)
      if (cleanup.error && import.meta.env.DEV)
        console.error('Photo cleanup requires retry', cleanup.error)
    }
    // Do not remove objects on an ambiguous database response: the insert may have committed.
    // Keep paths visible in development for owner-scoped cleanup; never report success.
    if (import.meta.env.DEV)
      console.error('Reptile photo save failed', { uploaded, error })
    throw error
  }
}
export async function deleteReptile(id: string) {
  const animal = await reptilesRepo.getById(id)
  if (!animal) throw new Error('Reptile not found.')
  await reptilesRepo.update(id, { deleting: true, status: 'archived' })
  const media = (await readPrintRows<ReptileMedia>('reptile_media')).filter(
    (m) => m.reptileId === id,
  )
  const paths = media.flatMap((m) => [
    m.storagePath,
    ...(m.thumbnailPath ? [m.thumbnailPath] : []),
  ])
  const client = requireSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || !auth.user)
    throw new Error('Sign in again before deleting photos.')
  async function collect(prefix: string) {
    for (let offset = 0; ; offset += 100) {
      const { data: objects, error } = await client.storage
        .from('plant-media')
        .list(prefix, {
          limit: 100,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })
      if (error)
        throw new Error(
          'Could not verify all reptile photo files. Deletion stopped; retry to finish.',
          { cause: error },
        )
      for (const object of objects ?? []) {
        const path = prefix + '/' + object.name
        if (object.id) paths.push(path)
        else await collect(path)
      }
      if ((objects?.length ?? 0) < 100) break
    }
  }
  await collect(`${auth.user.id}/reptiles/${id}`)
  const uniquePaths = [...new Set(paths)]
  for (let i = 0; i < uniquePaths.length; i += 100) {
    const { error } = await requireSupabase()
      .storage.from('plant-media')
      .remove(uniquePaths.slice(i, i + 100))
    if (error)
      throw new Error(
        'Photo cleanup failed. The reptile remains archived; retry Delete to finish.',
        { cause: error },
      )
  }
  await reptilesRepo.delete(id)
}
export async function deleteReptilePhoto(media: ReptileMedia) {
  const { error } = await requireSupabase()
    .storage.from('plant-media')
    .remove([
      media.storagePath,
      ...(media.thumbnailPath ? [media.thumbnailPath] : []),
    ])
  if (error) throw repositoryError('photo deletion', error)
  await reptileMediaRepo.delete(media.id)
}

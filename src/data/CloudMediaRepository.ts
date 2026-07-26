import type { CreateInput } from '../db/repositories/BaseRepository'
import type { MediaAsset } from '../models'
import { requireSupabase } from '../lib/supabase'
import {
  fromSupabaseRow,
  assertOnline,
  repositoryError,
  SupabaseRepository,
  toSupabaseRow,
} from './SupabaseRepository'

const bucket = 'plant-media'

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

async function currentUserId() {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user) throw new Error('Sign in again to continue.')
  return data.user.id
}

export class CloudMediaRepository extends SupabaseRepository<MediaAsset> {
  constructor() {
    super('plant_media')
  }

  private async withUrls(row: Record<string, unknown>) {
    const asset = fromSupabaseRow<MediaAsset>(row)
    const paths = [asset.storagePath, asset.thumbnailPath].filter(
      (path): path is string => Boolean(path),
    )
    const { data, error } = await requireSupabase()
      .storage.from(bucket)
      .createSignedUrls(paths, 3600)
    if (error)
      throw new Error('Photo access failed. Please retry.', { cause: error })
    const urls = new Map(data.map((item) => [item.path, item.signedUrl]))
    return {
      ...asset,
      signedUrl: asset.storagePath
        ? (urls.get(asset.storagePath) ?? undefined)
        : undefined,
      thumbnailUrl: asset.thumbnailPath
        ? (urls.get(asset.thumbnailPath) ?? undefined)
        : undefined,
    }
  }

  override async getAll() {
    const { data, error } = await requireSupabase()
      .from(this.table)
      .select('*')
      .order('uploaded_at', { ascending: false })
    if (error) throw repositoryError('read', error)
    return Promise.all((data ?? []).map((row) => this.withUrls(row)))
  }

  override async getById(id: string) {
    const { data, error } = await requireSupabase()
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw repositoryError('read', error)
    return data ? this.withUrls(data) : undefined
  }

  async getByPlantId(plantId: string) {
    return (await this.getAll()).filter((asset) => asset.plantId === plantId)
  }

  async getByFingerprint(fingerprint: string) {
    return (await this.getAll()).find(
      (asset) => asset.fingerprint === fingerprint,
    )
  }

  override async create(input: CreateInput<MediaAsset>) {
    assertOnline()
    if (!input.blob) throw new Error('The original photo is unavailable.')
    const client = requireSupabase()
    const owner = await currentUserId()
    const id = crypto.randomUUID()
    const base = `${owner}/${input.plantId}/${id}`
    const originalPath = `${base}/${safeName(input.fileName)}`
    const thumbnailPath = input.thumbnailBlob
      ? `${base}/thumbnail.webp`
      : undefined
    const uploaded: string[] = []
    try {
      const original = await client.storage
        .from(bucket)
        .upload(originalPath, input.blob, {
          contentType: input.mimeType,
          upsert: false,
        })
      if (original.error) throw original.error
      uploaded.push(originalPath)
      if (input.thumbnailBlob && thumbnailPath) {
        const thumbnail = await client.storage
          .from(bucket)
          .upload(thumbnailPath, input.thumbnailBlob, {
            contentType: input.thumbnailBlob.type || 'image/webp',
            upsert: false,
          })
        if (thumbnail.error) throw thumbnail.error
        uploaded.push(thumbnailPath)
      }
      const row = {
        ...toSupabaseRow(input),
        id,
        user_id: owner,
        storage_path: originalPath,
        thumbnail_path: thumbnailPath,
      }
      const { data, error } = await client
        .from(this.table)
        .insert(row)
        .select('*')
        .single()
      if (error) throw error
      return this.withUrls(data)
    } catch {
      if (uploaded.length) await client.storage.from(bucket).remove(uploaded)
      throw new Error('Photo upload failed. Check your connection and retry.')
    }
  }

  async createMany(inputs: Array<CreateInput<MediaAsset>>) {
    const records: MediaAsset[] = []
    for (const input of inputs) records.push(await this.create(input))
    return records
  }

  async setHero(plantId: string, mediaId: string) {
    assertOnline()
    const { error } = await requireSupabase().rpc('set_plant_media_hero', {
      target_plant_id: plantId,
      target_media_id: mediaId,
    })
    if (error) throw new Error('Hero image could not be changed. Please retry.')
  }

  async toggleFavorite(id: string) {
    const asset = await this.getById(id)
    return asset
      ? this.update(id, { isFavorite: !asset.isFavorite })
      : undefined
  }

  updateNotes(id: string, notes: string) {
    return this.update(id, { notes: notes.trim() || undefined })
  }

  updateTags(id: string, tags: string[]) {
    return this.update(id, {
      tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
    })
  }

  override async delete(id: string) {
    assertOnline()
    const asset = await this.getById(id)
    if (!asset) return
    const { error } = await requireSupabase().rpc('delete_media_and_promote', {
      target_media_id: id,
    })
    if (error) throw new Error('Photo could not be deleted. Please retry.')
    const paths = [asset.storagePath, asset.thumbnailPath].filter(
      (path): path is string => Boolean(path),
    )
    if (paths.length) {
      const removal = await requireSupabase().storage.from(bucket).remove(paths)
      if (removal.error)
        throw new Error(
          'Photo record was deleted, but storage cleanup must be retried.',
        )
    }
  }
}

export const cloudMediaRepository = new CloudMediaRepository()

import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'
import { isLocalCollectionMode } from '../../data/localCollectionMode'
import { fromSupabaseRow, repositoryError } from '../../data/SupabaseRepository'
import { plantRepository } from '../../db/repositories/PlantRepository'
import { spaceRepository } from '../../db/repositories/SpaceRepository'
import { mediaRepository } from '../../db/repositories/MediaRepository'
import { localNfcTagRepository } from '../../db/repositories/NfcTagRepository'
import { ensureSeedData } from '../../db/seed'
import type { MediaAsset, NfcTag, Plant, Space } from '../../models'

// Bulk metadata reads: no per-plant requests and no silent local fallback on a
// failed cloud read, which could otherwise label existing assignments "missing".
export async function readPrintRows<T>(table: string): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await requireSupabase()
      .from(table)
      .select('*')
      .order('id')
      .range(offset, offset + pageSize - 1)
    if (error) throw repositoryError('read', error)
    rows.push(...(data ?? []).map((row) => fromSupabaseRow<T>(row)))
    if ((data?.length ?? 0) < pageSize) return rows
  }
}

export async function readPrintMedia() {
  const assets = await readPrintRows<MediaAsset>('plant_media')
  const paths = [
    ...new Set(
      assets
        .map((asset) => asset.thumbnailPath)
        .filter((path): path is string => !!path),
    ),
  ]
  const urls = new Map<string, string>()
  for (let i = 0; i < paths.length; i += 500) {
    const { data, error } = await requireSupabase()
      .storage.from('plant-media')
      .createSignedUrls(paths.slice(i, i + 500), 3600)
    if (error) throw repositoryError('thumbnail access', error)
    for (const item of data ?? [])
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  // Never load original-resolution images just to print a small thumbnail.
  return assets.map((asset) => ({
    ...asset,
    signedUrl: undefined,
    thumbnailUrl: urls.get(asset.thumbnailPath ?? ''),
  }))
}

export function useCollectionPrintData() {
  const local = !isSupabaseConfigured || isLocalCollectionMode()
  const query = <T>(
    key: string,
    cloud: () => Promise<T[]>,
    localRead: () => Promise<T[]>,
  ) => ({
    queryKey: [key, 'collection-print', local],
    queryFn: async () => {
      if (!local) return cloud()
      if (!isSupabaseConfigured) await ensureSeedData()
      return localRead()
    },
    staleTime: 0,
    throwOnError: false,
  })
  const plants = useQuery(
    query(
      'plants',
      () => readPrintRows<Plant>('plants'),
      () => plantRepository.getAll(),
    ),
  )
  const spaces = useQuery(
    query(
      'spaces',
      () => readPrintRows<Space>('spaces'),
      () => spaceRepository.getAll(),
    ),
  )
  const media = useQuery(
    query('media', readPrintMedia, () => mediaRepository.getAll()),
  )
  const tags = useQuery(
    query(
      'nfc-tags',
      () => readPrintRows<NfcTag>('nfc_tags'),
      () => localNfcTagRepository.listAssigned(),
    ),
  )
  return {
    local,
    plants: plants.data ?? [],
    spaces: spaces.data ?? [],
    media: media.data ?? [],
    tags: tags.data ?? [],
    loading:
      plants.isPending || spaces.isPending || media.isPending || tags.isPending,
    error: plants.error || spaces.error || media.error || tags.error,
    retry: () =>
      Promise.all([
        plants.refetch(),
        spaces.refetch(),
        media.refetch(),
        tags.refetch(),
      ]),
  }
}

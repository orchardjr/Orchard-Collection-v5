import {
  mediaRepository,
  plantRepository,
  timelineRepository,
} from '../db/repositories'
import { prepareMediaFile } from '../features/media/mediaProcessing'
import type { MediaAsset } from '../models'
import { formatSupabaseErrorDetails } from '../data/supabaseErrorDetails'

export interface MediaImportResult {
  fileName: string
  success: boolean
  asset?: MediaAsset
  error?: string
}
export interface MediaImportProgress {
  completed: number
  total: number
  fileName: string
}

export class MediaService {
  constructor(private readonly prepare = prepareMediaFile) {}

  async importFiles(
    plantId: string,
    files: File[],
    onProgress?: (progress: MediaImportProgress) => void,
  ): Promise<MediaImportResult[]> {
    const existing = await mediaRepository.getByPlantId(plantId)
    const results: MediaImportResult[] = []
    for (const [index, file] of files.entries()) {
      try {
        const input = await this.prepare(
          file,
          plantId,
          existing.length === 0 && results.every((result) => !result.asset),
        )
        if (await mediaRepository.getByFingerprint(input.fingerprint))
          throw new Error('This photo is already in the collection.')
        const asset = await mediaRepository.create(input)
        results.push({ fileName: file.name, success: true, asset })
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Import failed.',
        })
      }
      onProgress?.({
        completed: index + 1,
        total: files.length,
        fileName: file.name,
      })
    }

    const imported = results.flatMap((result) =>
      result.asset ? [result.asset] : [],
    )
    if (imported.length) {
      const hero = imported.find((asset) => asset.isHero)
      if (hero) {
        try {
          await plantRepository.update(plantId, {
            heroMediaId: hero.id,
            heroImageUrl: undefined,
          })
        } catch (error) {
          throw new Error(
            `Photo was uploaded and its plant_media row was created, but the plant hero-image update failed. Plant ID: ${plantId}. Media ID: ${hero.id}. ${formatSupabaseErrorDetails(error)}`,
            { cause: error },
          )
        }
      }
      try {
        await timelineRepository.create({
          plantId,
          title:
            imported.length === 1 ? 'Photo added' : 'Multiple photos added',
          description:
            imported.length === 1
              ? imported[0]?.fileName
              : `${imported.length} photos added`,
          eventType: 'media',
          occurredAt: new Date(),
          metadata: { count: imported.length, mediaId: imported[0]?.id ?? '' },
        })
      } catch (error) {
        throw new Error(
          `Photo upload succeeded, but its timeline event failed. Plant ID: ${plantId}. ${formatSupabaseErrorDetails(error)}`,
          { cause: error },
        )
      }
    }
    return results
  }

  async setHero(asset: MediaAsset): Promise<void> {
    await mediaRepository.setHero(asset.plantId, asset.id)
    await plantRepository.update(asset.plantId, {
      heroMediaId: asset.id,
      heroImageUrl: undefined,
    })
    await this.event(asset, 'Hero image changed')
  }

  async toggleFavorite(asset: MediaAsset): Promise<MediaAsset | undefined> {
    const updated = await mediaRepository.toggleFavorite(asset.id)
    if (updated)
      await this.event(
        updated,
        updated.isFavorite ? 'Photo favorited' : 'Photo unfavorited',
      )
    return updated
  }

  async updateNotes(asset: MediaAsset, notes: string): Promise<void> {
    if ((asset.notes ?? '').trim() === notes.trim()) return
    await mediaRepository.updateNotes(asset.id, notes)
    await this.event(asset, 'Photo notes updated')
  }

  updateTags(
    asset: MediaAsset,
    tags: string[],
  ): Promise<MediaAsset | undefined> {
    return mediaRepository.updateTags(asset.id, tags)
  }

  async delete(asset: MediaAsset): Promise<void> {
    await mediaRepository.delete(asset.id)
    const hero = (await mediaRepository.getByPlantId(asset.plantId)).find(
      (item) => item.isHero,
    )
    await plantRepository.update(asset.plantId, { heroMediaId: hero?.id })
    await this.event(asset, 'Photo deleted')
  }

  private async event(asset: MediaAsset, title: string) {
    await timelineRepository.create({
      plantId: asset.plantId,
      title,
      description: asset.fileName,
      eventType: 'media',
      occurredAt: new Date(),
      metadata: { mediaId: asset.id },
    })
  }
}

export const mediaService = new MediaService()

import {
  mediaRepository,
  plantRepository,
  timelineRepository,
} from '../db/repositories'
import { prepareMediaFile } from '../features/media/mediaProcessing'
import type { MediaAsset } from '../models'
import { formatSupabaseErrorDetails } from '../data/supabaseErrorDetails'
import { SavedMediaWarning } from '../data/SavedMediaWarning'

export interface MediaImportResult {
  fileName: string
  success: boolean
  asset?: MediaAsset
  error?: string
  warning?: string
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
    const existing = await mediaRepository.getByPlantId(plantId, true)
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
        if (error instanceof SavedMediaWarning) {
          results.push({
            fileName: file.name,
            success: true,
            asset: error.asset,
            warning: error.message,
          })
        } else
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
      const warn = (message: string) => {
        for (const result of results)
          if (result.success)
            result.warning = [result.warning, message].filter(Boolean).join(' ')
      }
      const hero = imported.find((asset) => asset.isHero)
      if (hero) {
        try {
          const updated = await plantRepository.update(plantId, {
            heroMediaId: hero.id,
            heroImageUrl: undefined,
          })
          if (!updated)
            throw new Error('Plant was not found or could not be updated.')
        } catch (error) {
          warn(
            `Photo saved, but the cover-image update failed. Use the gallery's cover action to retry without uploading again. ${formatSupabaseErrorDetails(error)}`,
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
        warn(
          `Photo saved, but its timeline event could not be recorded. Do not upload it again. ${formatSupabaseErrorDetails(error)}`,
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

import type { BaseRecord } from './BaseRecord'

export type MediaAssetType = 'image' | 'video' | 'audio' | 'document'

export interface MediaAsset extends BaseRecord {
  plantId: string
  fileName: string
  mimeType: string
  blob: Blob
  thumbnailBlob?: Blob
  width?: number
  height?: number
  fileSize: number
  dateTaken?: Date
  uploadedAt: Date
  isHero: boolean
  isFavorite: boolean
  notes?: string
  tags: string[]
  cameraMake?: string
  cameraModel?: string
  lensModel?: string
  orientation?: number
  fingerprint: string
}

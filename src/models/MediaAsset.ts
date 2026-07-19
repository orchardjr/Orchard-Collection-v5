import type { BaseRecord } from './BaseRecord'

export type MediaAssetType = 'image' | 'video' | 'audio' | 'document'

export interface MediaAsset extends BaseRecord {
  plantId?: string
  name: string
  type: MediaAssetType
  mimeType: string
  url: string
  capturedAt?: Date
  altText?: string
}

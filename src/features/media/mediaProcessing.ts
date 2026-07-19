import type { CreateInput } from '../../db/repositories'
import type { MediaAsset } from '../../models'

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const acceptedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export function validateImageFile(file: File): string | undefined {
  if (!acceptedTypes.has(file.type)) return 'Unsupported image format.'
  if (file.size === 0) return 'The file is empty.'
  if (file.size > MAX_IMAGE_BYTES) return 'The image exceeds the 25 MB limit.'
  return undefined
}

export async function fingerprintFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

async function canvasBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob | undefined> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/webp', 0.82),
  )
}

async function decodeImage(
  file: File,
): Promise<{ width?: number; height?: number; thumbnailBlob?: Blob }> {
  if (typeof createImageBitmap !== 'function') return {}
  try {
    const image = await createImageBitmap(file)
    const scale = Math.min(1, 720 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
    const thumbnailBlob = await canvasBlob(canvas)
    const dimensions = {
      width: image.width,
      height: image.height,
      thumbnailBlob,
    }
    image.close()
    return dimensions
  } catch {
    return {}
  }
}

interface ExifMetadata {
  Make?: string
  Model?: string
  LensModel?: string
  Orientation?: number
  DateTimeOriginal?: Date
}

async function extractMetadata(file: File): Promise<ExifMetadata> {
  if (file.type !== 'image/jpeg') return {}
  try {
    const metadata = await parse(file, [
      'Make',
      'Model',
      'LensModel',
      'Orientation',
      'DateTimeOriginal',
    ])
    return metadata && typeof metadata === 'object'
      ? (metadata as ExifMetadata)
      : {}
  } catch {
    return {}
  }
}

export async function prepareMediaFile(
  file: File,
  plantId: string,
  isHero: boolean,
): Promise<CreateInput<MediaAsset>> {
  const validationError = validateImageFile(file)
  if (validationError) throw new Error(validationError)
  const [fingerprint, image, metadata] = await Promise.all([
    fingerprintFile(file),
    decodeImage(file),
    extractMetadata(file),
  ])
  const now = new Date()
  return {
    plantId,
    fileName: file.name || `clipboard-${now.getTime()}.png`,
    mimeType: file.type,
    blob: file,
    thumbnailBlob: image.thumbnailBlob,
    width: image.width,
    height: image.height,
    dateTaken: metadata.DateTimeOriginal,
    fileSize: file.size,
    uploadedAt: now,
    isHero,
    isFavorite: false,
    tags: [],
    cameraMake: metadata.Make,
    cameraModel: metadata.Model,
    lensModel: metadata.LensModel,
    orientation: metadata.Orientation,
    fingerprint,
  }
}
import { parse } from 'exifr'

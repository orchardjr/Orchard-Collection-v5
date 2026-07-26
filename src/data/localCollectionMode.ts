import { db } from '../db/database'

const LOCAL_MODE_KEY = 'orchard-use-local-collection'

export interface LocalCollectionSummary {
  plants: number
  spaces: number
  media: number
}

export function isLocalCollectionMode() {
  if (typeof window === 'undefined') return false
  const requested =
    new URLSearchParams(window.location.search).get('source') === 'local'
  try {
    return requested || sessionStorage.getItem(LOCAL_MODE_KEY) === 'true'
  } catch {
    return requested
  }
}

export async function enableLocalCollectionMode() {
  if (!db.isOpen()) await db.open()
  const [plants, spaces, media] = await Promise.all([
    db.plants.toArray(),
    db.spaces.toArray(),
    db.media.toArray(),
  ])
  try {
    sessionStorage.setItem(LOCAL_MODE_KEY, 'true')
  } catch {
    // The URL parameter remains a Safari-compatible fallback when storage is
    // unavailable in private browsing.
  }
  return {
    plants: plants.length,
    spaces: spaces.length,
    media: media.length,
  } satisfies LocalCollectionSummary
}

export function localCollectionUrl(pathname = '/collection') {
  return `${pathname}?source=local`
}

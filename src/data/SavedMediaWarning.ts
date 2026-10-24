import type { MediaAsset } from '../models'

// The database row and Storage objects are committed. Never retry the upload
// itself when only fetching its display URLs failed.
export class SavedMediaWarning extends Error {
  constructor(
    readonly asset: MediaAsset,
    message: string,
    cause: unknown,
  ) {
    super(message, { cause })
  }
}

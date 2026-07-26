import type { NfcTag } from '../../models'

export function normalizeNfcTagQueryResult(tag: NfcTag | undefined) {
  return tag ?? null
}

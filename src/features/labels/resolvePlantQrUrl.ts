import type { NfcTag, Plant } from '../../models'
import { isUuid } from '../../lib/isUuid'
import {
  ORCHARD_NFC_ORIGIN,
  orchardNfcUrl,
} from '../../services/NfcHardwareService'

type AssignedNfcTag = Pick<NfcTag, 'publicToken'>

export function orchardPlantUrl(plantId: string) {
  const normalized = plantId.trim()
  return normalized
    ? `${ORCHARD_NFC_ORIGIN}/collection/${encodeURIComponent(normalized)}`
    : undefined
}

export function resolvePlantQrUrl(
  plant: Plant,
  assignedNfcTag?: AssignedNfcTag,
) {
  const token = assignedNfcTag?.publicToken.trim()
  if (token && isUuid(token)) return orchardNfcUrl(token)
  return orchardPlantUrl(plant.id)
}

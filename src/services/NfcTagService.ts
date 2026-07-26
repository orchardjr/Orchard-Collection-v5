import { nfcTagRepository } from '../db/repositories'
import { localNfcTagRepository } from '../db/repositories/NfcTagRepository'
import type { AssignNfcTagInput } from '../db/repositories'
import { resolveCloudNfcToken } from '../data/CloudNfcTagRepository'
import { isSupabaseConfigured } from '../lib/supabase'
import { isUuid } from '../lib/isUuid'

class NfcTagService {
  assignTag(input: AssignNfcTagInput) {
    return (
      isUuid(input.resourceId) ? nfcTagRepository : localNfcTagRepository
    ).assignTag(input)
  }

  async unassignTag(id: string) {
    if (await localNfcTagRepository.getById(id))
      return localNfcTagRepository.unassignTag(id)
    return nfcTagRepository.unassignTag(id)
  }

  async replaceTag(
    id: string,
    input: Omit<AssignNfcTagInput, 'resourceType' | 'resourceId'> = {},
  ) {
    if (await localNfcTagRepository.getById(id))
      return localNfcTagRepository.replaceTag(id, input)
    return nfcTagRepository.replaceTag(id, input)
  }

  async resolvePublicToken(publicToken: string, device?: string) {
    if (isSupabaseConfigured) {
      const cloudTag = await resolveCloudNfcToken(publicToken, device)
      if (cloudTag) return cloudTag
    }
    const tag = await localNfcTagRepository.findByToken(publicToken)
    if (!tag?.resourceId) return undefined
    await localNfcTagRepository.updateLastScan(tag.id, new Date(), device)
    return {
      publicToken: tag.publicToken,
      resourceType: tag.resourceType,
      resourceId: tag.resourceId,
      nickname: tag.nickname,
    }
  }
}

export const nfcTagService = new NfcTagService()

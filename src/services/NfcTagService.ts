import { nfcTagRepository } from '../db/repositories'
import type { AssignNfcTagInput } from '../db/repositories'
import { resolveCloudNfcToken } from '../data/CloudNfcTagRepository'
import { isSupabaseConfigured } from '../lib/supabase'

class NfcTagService {
  assignTag(input: AssignNfcTagInput) {
    return nfcTagRepository.assignTag(input)
  }

  unassignTag(id: string) {
    return nfcTagRepository.unassignTag(id)
  }

  replaceTag(
    id: string,
    input: Omit<AssignNfcTagInput, 'resourceType' | 'resourceId'> = {},
  ) {
    return nfcTagRepository.replaceTag(id, input)
  }

  async resolvePublicToken(publicToken: string, device?: string) {
    if (isSupabaseConfigured) return resolveCloudNfcToken(publicToken, device)
    const tag = await nfcTagRepository.findByToken(publicToken)
    if (!tag?.resourceId) return undefined
    await nfcTagRepository.updateLastScan(tag.id, new Date(), device)
    return {
      publicToken: tag.publicToken,
      resourceType: tag.resourceType,
      resourceId: tag.resourceId,
      nickname: tag.nickname,
    }
  }
}

export const nfcTagService = new NfcTagService()

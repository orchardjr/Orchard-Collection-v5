import type { NfcTag, NfcResourceType } from '../../models'
import { createId } from '../../lib/createId'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export interface AssignNfcTagInput {
  resourceType: NfcResourceType
  resourceId: string
  publicToken?: string
  uid?: string
  nickname?: string
  notes?: string
}

export class NfcTagRepository extends BaseRepository<NfcTag> {
  constructor() {
    super(db.nfcTags)
  }

  async assignTag(input: AssignNfcTagInput) {
    const existing = await this.findAssigned(
      input.resourceType,
      input.resourceId,
    )
    if (existing) throw new Error('This resource already has an NFC tag.')
    const now = new Date()
    return this.create({
      ...input,
      publicToken: input.publicToken ?? createId(),
      assignedAt: now,
    })
  }

  async unassignTag(id: string) {
    return this.update(id, { resourceId: undefined, assignedAt: undefined })
  }

  async replaceTag(
    id: string,
    input: Omit<AssignNfcTagInput, 'resourceType' | 'resourceId'> = {},
  ) {
    const current = await this.getById(id)
    if (!current?.resourceId) throw new Error('The NFC tag is not assigned.')
    return db.transaction('rw', db.nfcTags, async () => {
      await this.unassignTag(id)
      return this.assignTag({
        ...input,
        publicToken: input.publicToken ?? createId(),
        resourceType: current.resourceType,
        resourceId: current.resourceId!,
        nickname: input.nickname ?? current.nickname,
        notes: input.notes ?? current.notes,
      })
    })
  }

  findByToken(publicToken: string) {
    return db.nfcTags.where('publicToken').equals(publicToken).first()
  }

  findByUID(uid: string) {
    return db.nfcTags.where('uid').equals(uid).first()
  }

  updateLastScan(id: string, scannedAt = new Date()) {
    return this.update(id, { lastScannedAt: scannedAt })
  }

  listAssigned() {
    return db.nfcTags.filter((tag) => Boolean(tag.resourceId)).toArray()
  }

  listUnassigned() {
    return db.nfcTags.filter((tag) => !tag.resourceId).toArray()
  }

  findAssigned(resourceType: NfcResourceType, resourceId: string) {
    return db.nfcTags
      .where('resourceId')
      .equals(resourceId)
      .filter((tag) => tag.resourceType === resourceType)
      .first()
  }
}

export const localNfcTagRepository = new NfcTagRepository()

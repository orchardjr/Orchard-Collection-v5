import type { NfcResourceType, NfcTag, PublicNfcResolution } from '../models'
import { createId } from '../lib/createId'
import { requireSupabase } from '../lib/supabase'
import {
  fromSupabaseRow,
  repositoryError,
  SupabaseRepository,
} from './SupabaseRepository'
import type { AssignNfcTagInput } from '../db/repositories/NfcTagRepository'

export class CloudNfcTagRepository extends SupabaseRepository<NfcTag> {
  constructor() {
    super('nfc_tags')
  }

  async assignTag(input: AssignNfcTagInput) {
    return this.create({
      ...input,
      publicToken: input.publicToken ?? createId(),
      assignedAt: new Date(),
    })
  }

  unassignTag(id: string) {
    return this.update(id, { resourceId: undefined, assignedAt: undefined })
  }

  async replaceTag(
    id: string,
    input: Omit<AssignNfcTagInput, 'resourceType' | 'resourceId'> = {},
  ) {
    const { data, error } = await requireSupabase().rpc('replace_nfc_tag', {
      input_tag_id: id,
      input_public_token: input.publicToken ?? createId(),
      input_uid: input.uid ?? null,
      input_nickname: input.nickname ?? null,
      input_notes: input.notes ?? null,
    })
    if (error) throw repositoryError('write', error)
    const row = Array.isArray(data) ? data[0] : data
    return row ? fromSupabaseRow<NfcTag>(row) : undefined
  }

  async findByToken(publicToken: string) {
    return this.findOne('public_token', publicToken)
  }

  async findByUID(uid: string) {
    return this.findOne('uid', uid)
  }

  updateLastScan(id: string, scannedAt = new Date()) {
    return this.update(id, { lastScannedAt: scannedAt })
  }

  async listAssigned() {
    const { data, error } = await requireSupabase()
      .from(this.table)
      .select('*')
      .not('resource_id', 'is', null)
      .order('assigned_at', { ascending: false })
    if (error) throw repositoryError('read', error)
    return (data ?? []).map((row) => fromSupabaseRow<NfcTag>(row))
  }

  async listUnassigned() {
    const { data, error } = await requireSupabase()
      .from(this.table)
      .select('*')
      .is('resource_id', null)
      .order('created_at')
    if (error) throw repositoryError('read', error)
    return (data ?? []).map((row) => fromSupabaseRow<NfcTag>(row))
  }

  async findAssigned(resourceType: NfcResourceType, resourceId: string) {
    const { data, error } = await requireSupabase()
      .from(this.table)
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .maybeSingle()
    if (error) throw repositoryError('read', error)
    return data ? fromSupabaseRow<NfcTag>(data) : undefined
  }

  private async findOne(column: 'public_token' | 'uid', value: string) {
    const { data, error } = await requireSupabase()
      .from(this.table)
      .select('*')
      .eq(column, value)
      .maybeSingle()
    if (error) throw repositoryError('read', error)
    return data ? fromSupabaseRow<NfcTag>(data) : undefined
  }
}

export async function resolveCloudNfcToken(
  publicToken: string,
): Promise<PublicNfcResolution | undefined> {
  const { data, error } = await requireSupabase().rpc('scan_nfc_tag', {
    token: publicToken,
  })
  if (error) throw repositoryError('read', error)
  const row = Array.isArray(data) ? data[0] : data
  return row ? fromSupabaseRow<PublicNfcResolution>(row) : undefined
}

export const cloudNfcTagRepository = new CloudNfcTagRepository()

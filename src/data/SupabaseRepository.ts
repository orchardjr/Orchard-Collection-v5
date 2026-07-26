import type { BaseRecord } from '../models'
import { requireSupabase } from '../lib/supabase'
import type {
  CreateInput,
  UpdateInput,
} from '../db/repositories/BaseRepository'

export interface Repository<T extends BaseRecord> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  create(input: CreateInput<T>): Promise<T>
  update(id: string, input: UpdateInput<T>): Promise<T | undefined>
  delete(id: string): Promise<void>
}

const dateKeys = new Set([
  'createdAt',
  'updatedAt',
  'purchaseDate',
  'archivedAt',
  'dueAt',
  'completedAt',
  'occurredAt',
  'dateTaken',
  'uploadedAt',
  'dateStarted',
  'breederStartedAt',
  'substrateAddedAt',
  'eggsCollectedAt',
  'eggsMovedAt',
  'estimatedHatchAt',
  'firstHatchAt',
  'mainHatchAt',
  'lastFedAt',
  'lastMoistureAt',
  'dateAdded',
  'datePurchased',
  'gutLoadStartedAt',
  'useByAt',
  'assignedAt',
  'lastScannedAt',
  'firstScannedAt',
])

function camel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function snake(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

export function fromSupabaseRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const domainKey = camel(key)
      return [
        domainKey,
        value !== null && dateKeys.has(domainKey)
          ? new Date(String(value))
          : value === null
            ? undefined
            : value,
      ]
    }),
  ) as T
}

export function toSupabaseRow(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !['blob', 'thumbnailBlob', 'signedUrl', 'thumbnailUrl'].includes(key),
      )
      .map(([key, field]) => [
        snake(key),
        field instanceof Date ? field.toISOString() : (field ?? null),
      ]),
  )
}

async function userId() {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Sign in again to continue.')
  return data.user.id
}

export function assertOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine)
    throw new Error(
      'You are offline. Reconnect before changing cloud-synced data.',
    )
}

interface SupabaseErrorDetails {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export function repositoryError(
  action: string,
  error?: SupabaseErrorDetails | null,
  development = import.meta.env.DEV,
) {
  const friendly = `Cloud ${action} failed. Check your connection and retry.`
  if (!error) return new Error(friendly)
  if (!development) return new Error(friendly, { cause: error })
  const diagnostic = [
    error.code ? `[${error.code}]` : undefined,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(' ')
  return new Error(diagnostic ? `${friendly} ${diagnostic}` : friendly, {
    cause: error,
  })
}

export class SupabaseRepository<T extends BaseRecord> implements Repository<T> {
  constructor(protected readonly table: string) {}

  async getAll(): Promise<T[]> {
    const client = requireSupabase()
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .order('created_at')
    if (error) throw repositoryError('read', error)
    return (data ?? []).map((row) => fromSupabaseRow<T>(row))
  }

  async getById(id: string): Promise<T | undefined> {
    const client = requireSupabase()
    const { data, error } = await client
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw repositoryError('read', error)
    return data ? fromSupabaseRow<T>(data) : undefined
  }

  async create(input: CreateInput<T>): Promise<T> {
    assertOnline()
    const client = requireSupabase()
    const row = { ...toSupabaseRow(input), user_id: await userId() }
    const { data, error } = await client
      .from(this.table)
      .insert(row)
      .select('*')
      .single()
    if (error) throw repositoryError('write', error)
    return fromSupabaseRow<T>(data)
  }

  async update(id: string, input: UpdateInput<T>): Promise<T | undefined> {
    assertOnline()
    const client = requireSupabase()
    const { data, error } = await client
      .from(this.table)
      .update(toSupabaseRow(input))
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw repositoryError('write', error)
    return data ? fromSupabaseRow<T>(data) : undefined
  }

  async delete(id: string): Promise<void> {
    assertOnline()
    const { error } = await requireSupabase()
      .from(this.table)
      .delete()
      .eq('id', id)
    if (error) throw repositoryError('delete', error)
  }
}

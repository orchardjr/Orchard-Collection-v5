import { db } from '../db/database'
import { BaseRepository } from '../db/repositories/BaseRepository'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase'
import type { SilkwormCohort, SilkwormEvent } from '../models/Silkworm'
import type { BaseRecord } from '../models/BaseRecord'
import {
  fromSupabaseRow,
  repositoryError,
  SupabaseRepository,
} from './SupabaseRepository'

class SilkwormRepository<T extends BaseRecord> extends SupabaseRepository<T> {
  override async getAll(): Promise<T[]> {
    const client = requireSupabase()
    const rows: T[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from(this.table)
        .select('*')
        .order('created_at')
        .order('id')
        .range(offset, offset + pageSize - 1)
      if (error) throw repositoryError('read', error)
      rows.push(...data.map((row) => fromSupabaseRow<T>(row)))
      if (data.length < pageSize) return rows
    }
  }
}

export const silkwormCohorts = isSupabaseConfigured
  ? new SilkwormRepository<SilkwormCohort>('silkworm_cohorts')
  : new BaseRepository(db.silkwormCohorts)

export const silkwormEvents = isSupabaseConfigured
  ? new SilkwormRepository<SilkwormEvent>('silkworm_events')
  : new BaseRepository(db.silkwormEvents)

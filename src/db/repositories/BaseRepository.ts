import type { Table, UpdateSpec } from 'dexie'

import type { BaseRecord } from '../../models'

export type CreateInput<T extends BaseRecord> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateInput<T extends BaseRecord> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt'>
>

export class BaseRepository<T extends BaseRecord> {
  constructor(private readonly table: Table<T, string>) {}

  getAll(): Promise<T[]> {
    return this.table.toArray()
  }

  getById(id: string): Promise<T | undefined> {
    return this.table.get(id)
  }

  async create(input: CreateInput<T>): Promise<T> {
    const now = new Date()
    const record = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as T

    await this.table.add(record)
    return record
  }

  async update(id: string, input: UpdateInput<T>): Promise<T | undefined> {
    await this.table.update(id, {
      ...input,
      updatedAt: new Date(),
    } as UpdateSpec<T>)
    return this.getById(id)
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id)
  }
}

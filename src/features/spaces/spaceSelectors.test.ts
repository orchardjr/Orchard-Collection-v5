import { describe, expect, it } from 'vitest'
import type { Space } from '../../models'
import { getAssignableSpaces } from './spaceSelectors'
const date = new Date()
const active = {
  id: 'a',
  name: 'Active',
  type: 'room',
  createdAt: date,
  updatedAt: date,
} satisfies Space
const archived = { ...active, id: 'b', name: 'Archived', archivedAt: date }
describe('getAssignableSpaces', () => {
  it('excludes archived spaces for new assignments', () =>
    expect(getAssignableSpaces([active, archived]).map((s) => s.id)).toEqual([
      'a',
    ]))
  it('retains a current archived assignment', () =>
    expect(
      getAssignableSpaces([active, archived], 'b').map((s) => s.id),
    ).toEqual(['a', 'b']))
})

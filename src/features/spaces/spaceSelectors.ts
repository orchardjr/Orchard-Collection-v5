import type { Space } from '../../models'
export function getAssignableSpaces(spaces: Space[], currentSpaceId?: string) {
  return spaces.filter(
    (space) => !space.archivedAt || space.id === currentSpaceId,
  )
}

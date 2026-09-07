import {
  useAllMedia,
  usePlants,
  useSpaces,
  useTaskMutations,
} from '../../hooks/useOrchardData'
import { TaskFormDialog } from './TaskFormDialog'
import { usePlantAssignmentTags } from './usePlantAssignmentTags'

export function PlantTaskDialog({
  plantIds,
  onClose,
  onSaved,
}: {
  plantIds: string[]
  onClose: () => void
  onSaved?: () => void
}) {
  const { data: plants = [] } = usePlants()
  const { data: spaces = [] } = useSpaces()
  const { data: media = [] } = useAllMedia()
  const { data: plantTags = [] } = usePlantAssignmentTags()
  const { createTask } = useTaskMutations()
  return (
    <TaskFormDialog
      plants={plants}
      spaces={spaces}
      media={media}
      plantTags={plantTags}
      plantIds={plantIds}
      onClose={onClose}
      error={createTask.error?.message}
      onSave={async (input) => {
        await createTask.mutateAsync(input)
        onSaved?.()
        onClose()
      }}
    />
  )
}

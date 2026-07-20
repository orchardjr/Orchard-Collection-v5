import { Check, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { CreateInput } from '../../../db/repositories'
import { useTaskMutations } from '../../../hooks/useOrchardData'
import type { Plant, Space, Task } from '../../../models'
import { TaskFormDialog } from '../../tasks/TaskFormDialog'
export function TasksTab({
  plant,
  tasks,
  plants,
  spaces,
}: {
  plant: Plant
  tasks: Task[]
  plants: Plant[]
  spaces: Space[]
}) {
  const [open, setOpen] = useState(false)
  const m = useTaskMutations()
  const error = Object.values(m).find((x) => x.error instanceof Error)?.error
  const save = async (input: CreateInput<Task>) => {
    await m.createTask.mutateAsync(input)
    setOpen(false)
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add task
        </Button>
      </div>
      {tasks.length ? (
        tasks.map((task) => (
          <Card
            key={task.id}
            title={task.title}
            description={task.dueAt?.toLocaleString() ?? 'No due date'}
          >
            <div className="flex gap-2">
              <span className="capitalize text-sm text-muted-foreground">
                {task.status} · {task.priority}
              </span>
              {task.status === 'open' ? (
                <Button onClick={() => m.completeTask.mutate(task.id)}>
                  <Check size={15} />
                  Complete
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => m.reopenTask.mutate(task.id)}
                >
                  <RotateCcw size={15} />
                  Reopen
                </Button>
              )}
            </div>
          </Card>
        ))
      ) : (
        <Card>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tasks linked to this plant.
          </p>
        </Card>
      )}
      {error instanceof Error && (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      )}
      {open && (
        <TaskFormDialog
          plants={plants}
          spaces={spaces}
          plantId={plant.id}
          error={error instanceof Error ? error.message : undefined}
          onClose={() => setOpen(false)}
          onSave={save}
        />
      )}
    </div>
  )
}

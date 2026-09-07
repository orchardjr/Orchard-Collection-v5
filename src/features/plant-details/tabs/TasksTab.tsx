import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useTaskMutations } from '../../../hooks/useOrchardData'
import type { Plant, Task } from '../../../models'
import { PlantTaskDialog } from '../../tasks/PlantTaskDialog'
import {
  plantTaskGroups,
  recurrenceLabel,
  taskTypes,
} from '../../tasks/taskScheduling'

export function TasksTab({ plant, tasks }: { plant: Plant; tasks: Task[] }) {
  const [open, setOpen] = useState(false)
  const { completeTask } = useTaskMutations()
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add task
        </Button>
      </div>
      {plantTaskGroups(tasks).map(([label, grouped]) => (
        <section key={label}>
          <h2 className="mb-3 font-display text-xl font-semibold">
            {label}{' '}
            <span className="text-sm text-muted-foreground">
              ({grouped.length})
            </span>
          </h2>
          <div className="space-y-3">
            {grouped.length ? (
              grouped.map((task) => (
                <Card
                  key={task.id}
                  title={task.title}
                  description={task.dueAt?.toLocaleString() ?? 'No due date'}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {taskTypes[task.type]} · {recurrenceLabel(task)}
                    </p>
                    {task.status === 'open' && (
                      <Button
                        disabled={completeTask.isPending}
                        onClick={() => completeTask.mutate(task.id)}
                        aria-label={'Complete ' + task.title}
                      >
                        <Check size={16} />
                        Complete
                      </Button>
                    )}
                  </div>
                  {task.status === 'completed' && (
                    <p className="mt-2 text-xs">
                      Completed {task.completedAt?.toLocaleString()}
                    </p>
                  )}
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks in this section.
              </p>
            )}
          </div>
        </section>
      ))}
      {completeTask.error && (
        <p role="alert" className="break-words text-sm text-red-600">
          {completeTask.error.message}
        </p>
      )}
      {open && (
        <PlantTaskDialog plantIds={[plant.id]} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}

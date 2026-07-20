import {
  Archive,
  Check,
  ListTodo,
  Pencil,
  Plus,
  RotateCcw,
  SkipForward,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import type { CreateInput } from '../db/repositories'
import { TaskFormDialog } from '../features/tasks/TaskFormDialog'
import {
  usePlants,
  useSpaces,
  useTaskMutations,
  useTasks,
} from '../hooks/useOrchardData'
import type { Task } from '../models'
export function TasksPage() {
  const { data: tasks = [], isLoading } = useTasks()
  const { data: plants = [] } = usePlants()
  const { data: spaces = [] } = useSpaces()
  const m = useTaskMutations()
  const [editing, setEditing] = useState<Task | null>()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('')
  const [plant, setPlant] = useState('')
  const [space, setSpace] = useState('')
  const [sort, setSort] = useState('due')
  const visible = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            (!status || t.status === status) &&
            (!type || t.type === type) &&
            (!priority || t.priority === priority) &&
            (!plant || t.plantId === plant) &&
            (!space || t.spaceId === space) &&
            `${t.title} ${t.description ?? ''}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'priority'
            ? priorityRank(b.priority) - priorityRank(a.priority)
            : sort === 'created'
              ? b.createdAt.getTime() - a.createdAt.getTime()
              : sort === 'plant'
                ? (
                    plants.find((p) => p.id === a.plantId)?.nickname ?? ''
                  ).localeCompare(
                    plants.find((p) => p.id === b.plantId)?.nickname ?? '',
                  )
                : (a.dueAt?.getTime() ?? Infinity) -
                  (b.dueAt?.getTime() ?? Infinity),
        ),
    [plant, plants, priority, search, sort, space, status, tasks, type],
  )
  const error = Object.values(m).find((x) => x.error instanceof Error)?.error
  const save = async (input: CreateInput<Task>) => {
    if (editing) await m.updateTask.mutateAsync({ id: editing.id, input })
    else await m.createTask.mutateAsync(input)
    setEditing(undefined)
  }
  return (
    <Page
      title="Tasks"
      subtitle="Plan and complete daily collection work."
      actions={
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} />
          Add task
        </Button>
      }
    >
      <div className="mb-6 grid gap-2 rounded-2xl border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          aria-label="Search tasks"
          placeholder="Search tasks…"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {[
          [
            'Status',
            status,
            setStatus,
            ['open', 'completed', 'skipped', 'archived'],
          ],
          [
            'Type',
            type,
            setType,
            [
              'water',
              'fertilize',
              'repot',
              'inspect',
              'photograph',
              'prune',
              'treat',
              'custom',
            ],
          ],
          [
            'Priority',
            priority,
            setPriority,
            ['low', 'normal', 'high', 'urgent'],
          ],
        ].map(([label, value, setter, values]) => (
          <select
            key={label as string}
            aria-label={`${label} filter`}
            className="h-11 rounded-xl border border-border bg-background px-3"
            value={value as string}
            onChange={(e) => (setter as (v: string) => void)(e.target.value)}
          >
            <option value="">
              All{' '}
              {label === 'Status'
                ? 'statuses'
                : label === 'Priority'
                  ? 'priorities'
                  : `${String(label).toLowerCase()}s`}
            </option>
            {(values as string[]).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
        <select
          aria-label="Plant filter"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={plant}
          onChange={(e) => setPlant(e.target.value)}
        >
          <option value="">All plants</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort tasks"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="plant">Plant</option>
          <option value="created">Creation date</option>
        </select>
        <select
          aria-label="Space filter"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={space}
          onChange={(e) => setSpace(e.target.value)}
        >
          <option value="">All spaces</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error instanceof Error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">
          {error.message}
        </p>
      )}
      {isLoading ? (
        <Skeleton className="h-72" />
      ) : visible.length ? (
        <div className="space-y-8">
          {taskGroups(visible).map(
            ([group, grouped]) =>
              grouped.length > 0 && (
                <section key={group}>
                  <h2 className="mb-3 font-display text-xl font-semibold">
                    {group}{' '}
                    <span className="text-sm text-muted-foreground">
                      {grouped.length}
                    </span>
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {grouped.map((task) => (
                      <Card
                        key={task.id}
                        title={task.title}
                        description={
                          plants.find((p) => p.id === task.plantId)?.nickname ??
                          task.description
                        }
                      >
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="accent">{task.type}</Badge>
                          <Badge>{task.status}</Badge>
                          <Badge>{task.priority}</Badge>
                          {task.dueAt && (
                            <Badge>{task.dueAt.toLocaleString()}</Badge>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => setEditing(task)}
                          >
                            <Pencil size={15} />
                            Edit
                          </Button>
                          {task.status === 'open' ? (
                            <>
                              <Button
                                onClick={() => m.completeTask.mutate(task.id)}
                              >
                                <Check size={15} />
                                Complete
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => m.skipTask.mutate(task.id)}
                              >
                                <SkipForward size={15} />
                                Skip
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => m.reopenTask.mutate(task.id)}
                            >
                              <RotateCcw size={15} />
                              Reopen
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() =>
                              window.confirm('Archive this task?') &&
                              m.archiveTask.mutate(task.id)
                            }
                          >
                            <Archive size={15} />
                            Archive
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      ) : (
        <EmptyState
          icon={ListTodo}
          title="No matching tasks"
          description="Add a task or adjust the filters."
        />
      )}
      {editing !== undefined && (
        <TaskFormDialog
          key={editing?.id ?? 'new'}
          task={editing ?? undefined}
          plants={plants}
          spaces={spaces}
          error={error instanceof Error ? error.message : undefined}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}
    </Page>
  )
}

function priorityRank(priority: Task['priority']) {
  return { low: 0, normal: 1, high: 2, urgent: 3 }[priority]
}
function taskGroups(tasks: Task[]): Array<[string, Task[]]> {
  const now = new Date()
  const same = (date?: Date) => date?.toDateString() === now.toDateString()
  return [
    [
      'Overdue',
      tasks.filter(
        (t) =>
          t.status === 'open' && t.dueAt && t.dueAt < now && !same(t.dueAt),
      ),
    ],
    ['Today', tasks.filter((t) => t.status === 'open' && same(t.dueAt))],
    [
      'Upcoming',
      tasks.filter(
        (t) =>
          t.status === 'open' && (!t.dueAt || t.dueAt > now) && !same(t.dueAt),
      ),
    ],
    ['Completed', tasks.filter((t) => t.status !== 'open')],
  ]
}

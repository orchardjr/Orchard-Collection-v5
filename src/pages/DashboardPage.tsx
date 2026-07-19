import {
  ArrowRight,
  Boxes,
  Check,
  Clock3,
  ImagePlus,
  Library,
  Plus,
  Sprout,
  Tags,
} from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Page } from '../components/ui/Page'
import { PageHeader } from '../components/ui/PageHeader'
import { Skeleton } from '../components/ui/Skeleton'
import { StatCard } from '../components/ui/StatCard'
import { useDashboardData } from '../hooks/useOrchardData'
import type { Task } from '../models'

function formatTaskTime(task: Task) {
  if (task.status === 'completed') return 'Completed'
  if (!task.dueAt) return 'No due time'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(task.dueAt)
}

function DashboardLoading() {
  return (
    <div className="grid gap-5 xl:grid-cols-12" aria-label="Loading dashboard">
      <Skeleton className="h-72 xl:col-span-7" />
      <Skeleton className="h-72 xl:col-span-5" />
      <Skeleton className="h-64 xl:col-span-7" />
      <Skeleton className="h-64 xl:col-span-5" />
    </div>
  )
}

function getGreeting(hour: number) {
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardData()
  const activePercentage = data?.plants.length
    ? Math.round(
        (data.plants.filter((plant) => plant.status === 'active').length /
          data.plants.length) *
          100,
      )
    : 0

  return (
    <Page
      title="Dashboard"
      header={
        <PageHeader
          eyebrow={getGreeting(new Date().getHours())}
          title="Welcome back to Orchard Collection."
          subtitle={
            data
              ? `${data.plants.filter((plant) => plant.status === 'active').length} living plants · ${data.spaces.length} spaces · ${data.tasks.filter((task) => task.status !== 'completed').length} tasks today`
              : 'Your collection is waking up.'
          }
          actions={
            <Button>
              <Plus size={17} />
              Add item
            </Button>
          }
        />
      }
    >
      {isLoading || !data ? (
        <DashboardLoading />
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          <Card
            title="Collection Summary"
            description="Live from your local collection"
            className="xl:col-span-7"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Living items"
                value={data.plants.length}
                icon={Sprout}
              />
              <StatCard
                label="Spaces"
                value={data.spaces.length}
                icon={Boxes}
              />
              <StatCard
                label="Media assets"
                value={data.media.length}
                icon={ImagePlus}
              />
              <StatCard
                label="Active"
                value={
                  data.plants.filter((plant) => plant.status === 'active')
                    .length
                }
                icon={Library}
              />
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${activePercentage}%`,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Collection health</span>
              <span>
                {
                  data.plants.filter((plant) => plant.status === 'active')
                    .length
                }{' '}
                of {data.plants.length} active
              </span>
            </div>
          </Card>

          <Card
            title="Today's Tasks"
            description={`${data.tasks.length} items in your list`}
            action={
              <Button variant="ghost" className="px-2">
                View all <ArrowRight size={15} />
              </Button>
            }
            className="xl:col-span-5"
          >
            <div className="space-y-1">
              {data.tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-muted"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border ${task.status === 'completed' ? 'border-accent bg-accent text-accent-foreground' : 'border-border'}`}
                  >
                    {task.status === 'completed' && <Check size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 size={12} />
                      {formatTaskTime(task)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Recent Activity"
            description="The latest changes in your orchard"
            className="xl:col-span-7"
          >
            <div className="space-y-5">
              {data.timeline.slice(0, 3).map((event, index) => (
                <div key={event.id} className="flex gap-3">
                  <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.eventType} ·{' '}
                      {new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                      }).format(event.occurredAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Quick Actions"
            description="Common collection tools"
            className="xl:col-span-5"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Add item', icon: Plus },
                { label: 'Import media', icon: ImagePlus },
                { label: 'Create labels', icon: Tags },
                { label: 'Browse all', icon: Library },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-xl border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-accent-soft"
                >
                  <Icon size={20} className="text-accent" />
                  <span className="mt-3 block text-sm font-semibold text-foreground">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </Page>
  )
}

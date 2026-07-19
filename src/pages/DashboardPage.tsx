import {
  ArrowRight,
  Check,
  Clock3,
  ImagePlus,
  Library,
  Plus,
  Tags,
} from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Page } from '../components/ui/Page'

const activity = [
  { label: 'Added “Pressed fern study”', meta: 'Collection · 18 minutes ago' },
  { label: 'Updated the Library space', meta: 'Spaces · 2 hours ago' },
  { label: 'Created 6 botanical labels', meta: 'Label Studio · Yesterday' },
]

const tasks = [
  { title: 'Photograph field journals', time: '10:30 AM', done: false },
  { title: 'Review seed catalogue labels', time: '2:00 PM', done: false },
  { title: 'Archive spring receipts', time: 'Completed', done: true },
]

export function DashboardPage() {
  return (
    <Page
      title="Dashboard"
      subtitle="A calm overview of your collection and what needs attention today."
      actions={
        <Button>
          <Plus size={17} />
          Add item
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <Card
          title="Collection Summary"
          description="Across all spaces"
          className="xl:col-span-7"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['1,284', 'Total items'],
              ['18', 'Spaces'],
              ['42', 'Added this month'],
              ['96%', 'Catalogued'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-surface-muted p-4">
                <p className="font-display text-2xl font-semibold text-foreground">
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full w-[78%] rounded-full bg-accent" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Collection health</span>
            <span>78% enriched</span>
          </div>
        </Card>

        <Card
          title="Today's Tasks"
          description="3 items on your list"
          action={
            <Button variant="ghost" className="px-2">
              View all <ArrowRight size={15} />
            </Button>
          }
          className="xl:col-span-5"
        >
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.title}
                className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-muted"
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border ${task.done ? 'border-accent bg-accent text-accent-foreground' : 'border-border'}`}
                >
                  {task.done && <Check size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 size={12} />
                    {task.time}
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
            {activity.map((item, index) => (
              <div key={item.label} className="flex gap-3">
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.meta}
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
                className="group rounded-xl border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-accent-soft"
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
    </Page>
  )
}

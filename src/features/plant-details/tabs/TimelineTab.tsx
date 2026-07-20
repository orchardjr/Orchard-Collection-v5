import {
  Droplets,
  Leaf,
  MapPin,
  NotebookPen,
  ListTodo,
  Eye,
  Image,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

import { Card } from '../../../components/ui/Card'
import type { TimelineEvent, TimelineEventType } from '../../../models'

const eventPresentation: Record<
  TimelineEventType,
  { icon: LucideIcon; label: string }
> = {
  acquired: { icon: ShoppingBag, label: 'Acquired' },
  care: { icon: Droplets, label: 'Care' },
  growth: { icon: Leaf, label: 'Growth' },
  media: { icon: Image, label: 'Media' },
  task: { icon: ListTodo, label: 'Task' },
  observation: { icon: Eye, label: 'Observation' },
  note: { icon: NotebookPen, label: 'Note' },
  moved: { icon: MapPin, label: 'Moved' },
}

interface TimelineTabProps {
  events: TimelineEvent[]
}

export function TimelineTab({ events }: TimelineTabProps) {
  return (
    <Card title="Timeline" description="Newest events appear first">
      {events.length ? (
        <ol className="space-y-5">
          {events.map((event) => {
            const presentation = eventPresentation[event.eventType]
            const Icon = presentation.icon
            return (
              <li key={event.id} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 border-b border-border pb-5 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {event.title}
                    </h3>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={event.occurredAt.toISOString()}
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(event.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-accent">
                    {presentation.label}
                  </p>
                  {event.description && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No timeline events have been recorded yet.
        </p>
      )}
    </Card>
  )
}

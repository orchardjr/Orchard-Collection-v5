import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={22} aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}

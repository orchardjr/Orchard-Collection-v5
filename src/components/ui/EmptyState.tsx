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
    <div className="grid min-h-72 place-items-center rounded-[1.4rem] border border-dashed border-border/80 bg-surface/60 p-8 text-center shadow-card">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={22} aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-display text-xl font-semibold leading-tight text-foreground">
          {title}
        </h2>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeader({
  action,
  description,
  title,
}: SectionHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react'

import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string
  description?: string
  action?: ReactNode
}

export function Card({
  action,
  children,
  className,
  description,
  title,
  ...props
}: PropsWithChildren<CardProps>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6',
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="font-display text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

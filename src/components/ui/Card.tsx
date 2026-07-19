import type { HTMLAttributes, PropsWithChildren, ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { SectionHeader } from './SectionHeader'

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
        'rounded-[1.4rem] border border-border/75 bg-surface p-5 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:border-border hover:shadow-card-hover sm:p-7',
        className,
      )}
      {...props}
    >
      {(title || action) && (
        <div className="mb-6">
          <SectionHeader
            title={title ?? ''}
            description={description}
            action={action}
          />
        </div>
      )}
      {children}
    </section>
  )
}

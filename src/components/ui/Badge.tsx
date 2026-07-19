import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'accent' | 'neutral' | 'success' | 'warning' | 'danger'
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}
const variants: Record<BadgeVariant, string> = {
  accent: 'bg-accent text-accent-foreground',
  neutral: 'border border-border bg-surface-muted text-muted-foreground',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
}

export function Badge({
  children,
  className,
  variant = 'neutral',
  ...props
}: PropsWithChildren<BadgeProps>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

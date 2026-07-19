import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PropertyProps {
  label: string
  value?: ReactNode
  icon?: LucideIcon
  emptyValue?: ReactNode
}

export function Property({
  emptyValue = '—',
  icon: Icon,
  label,
  value,
}: PropertyProps) {
  const displayValue =
    value === undefined || value === null || value === '' ? emptyValue : value

  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-4">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon size={14} aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-medium text-foreground">
        {displayValue}
      </dd>
    </div>
  )
}

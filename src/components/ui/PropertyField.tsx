import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PropertyFieldProps {
  label: string
  value?: ReactNode
  icon?: LucideIcon
  emptyValue?: ReactNode
}

export function PropertyField({
  emptyValue = '—',
  icon: Icon,
  label,
  value,
}: PropertyFieldProps) {
  const displayValue =
    value === undefined || value === null || value === '' ? emptyValue : value
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/70 p-4">
      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {Icon && <Icon size={14} aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-2.5 break-words text-sm font-semibold leading-6 text-foreground">
        {displayValue}
      </dd>
    </div>
  )
}

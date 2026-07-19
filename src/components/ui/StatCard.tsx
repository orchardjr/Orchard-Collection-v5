import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-border/70 bg-surface-muted/70 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold leading-5 text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon size={16} className="text-accent" aria-hidden="true" />}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
    </motion.div>
  )
}

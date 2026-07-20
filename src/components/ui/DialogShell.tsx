import { X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Button } from './Button'

export function DialogShell({
  children,
  title,
  description,
  onClose,
}: {
  children: ReactNode
  title: string
  description: string
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-overlay p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <motion.div
        initial={{ scale: 0.98, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-border bg-surface shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface p-5">
          <div>
            <h2
              id="dialog-title"
              className="font-display text-xl font-semibold"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="ghost"
            className="size-10 px-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </header>
        {children}
      </motion.div>
    </motion.div>
  )
}

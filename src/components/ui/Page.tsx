import { motion } from 'framer-motion'
import type { PropsWithChildren, ReactNode } from 'react'

import { PageHeader } from './PageHeader'

interface PageProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  header?: ReactNode
}

export function Page({
  actions,
  children,
  header,
  subtitle,
  title,
}: PropsWithChildren<PageProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10"
    >
      <div className="mb-9">
        {header ?? (
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
        )}
      </div>
      {children}
    </motion.div>
  )
}

import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

import { queryClient } from '../../lib/queryClient'
import { AuthProvider } from '../../auth/AuthProvider'
import { RealtimeSync } from '../../sync/RealtimeSync'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeSync>{children}</RealtimeSync>
      </AuthProvider>
    </QueryClientProvider>
  )
}

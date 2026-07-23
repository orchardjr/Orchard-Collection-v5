import { CloudOff } from 'lucide-react'

import { isSupabaseConfigured } from '../../lib/supabase'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (!isSupabaseConfigured || online) return null

  return (
    <div
      role="status"
      className="flex min-h-11 items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <CloudOff aria-hidden="true" size={17} />
      Offline — saved cloud data remains readable, but changes are disabled.
    </div>
  )
}

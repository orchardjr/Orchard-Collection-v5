import { CloudOff } from 'lucide-react'

import { isSupabaseConfigured } from '../../lib/supabase'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (!isSupabaseConfigured || online) return null

  return (
    <div
      role="status"
      className="flex min-h-11 items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-semibold text-warning-foreground"
    >
      <CloudOff aria-hidden="true" size={17} />
      Offline — saved cloud data remains readable, but changes are disabled.
    </div>
  )
}

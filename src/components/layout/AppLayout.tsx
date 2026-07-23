import { X } from 'lucide-react'
import { Outlet } from 'react-router-dom'

import { useTheme } from '../../hooks/useTheme'
import { useUiStore } from '../../stores/uiStore'
import { Button } from '../ui/Button'
import { BottomNavigation } from './BottomNavigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { OfflineBanner } from './OfflineBanner'

export function AppLayout() {
  const drawerOpen = useUiStore((state) => state.drawerOpen)
  const closeDrawer = useUiStore((state) => state.closeDrawer)
  useTheme()

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <TopBar />
        <OfflineBanner />
        <main className="min-h-[calc(100vh-4rem)] pb-24 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNavigation />

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-overlay backdrop-blur-sm"
            onClick={closeDrawer}
            aria-label="Close navigation"
          />
          <div className="relative h-full w-[280px] max-w-[85vw] shadow-2xl">
            <Sidebar drawer onNavigate={closeDrawer} />
            <Button
              variant="ghost"
              className="absolute right-3 top-4 size-10 px-0"
              onClick={closeDrawer}
              aria-label="Close navigation"
            >
              <X size={20} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

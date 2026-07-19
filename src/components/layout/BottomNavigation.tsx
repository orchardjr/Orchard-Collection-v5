import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { navigationItems } from '../../config/navigation'
import { cn } from '../../lib/cn'
import { useUiStore } from '../../stores/uiStore'

export function BottomNavigation() {
  const toggleDrawer = useUiStore((state) => state.toggleDrawer)
  const items = navigationItems.slice(0, 4)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid h-18 grid-cols-5 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      {items.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-1 text-[10px] font-semibold',
              isActive ? 'text-accent' : 'text-muted-foreground',
            )
          }
        >
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={toggleDrawer}
        className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground"
        aria-label="Open all navigation"
      >
        <Menu size={20} aria-hidden="true" />
        More
      </button>
    </nav>
  )
}

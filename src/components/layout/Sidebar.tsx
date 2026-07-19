import { Leaf } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { navigationItems } from '../../config/navigation'
import { cn } from '../../lib/cn'

interface SidebarProps {
  drawer?: boolean
  onNavigate?: () => void
}

export function Sidebar({ drawer = false, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5',
        !drawer && 'hidden lg:flex',
      )}
    >
      <NavLink
        to="/"
        className="flex items-center gap-3 px-3 py-2"
        onClick={onNavigate}
      >
        <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">
          <Leaf size={21} aria-hidden="true" />
        </span>
        <span>
          <span className="block font-display text-lg font-semibold leading-5 text-foreground">
            Orchard
          </span>
          <span className="text-xs text-muted-foreground">Collection v5</span>
        </span>
      </NavLink>

      <nav className="mt-8 space-y-1" aria-label="Primary navigation">
        {navigationItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-sidebar-active-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )
            }
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-sidebar-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Seasonal note
        </p>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          A place for every object, story, and memory.
        </p>
      </div>
    </aside>
  )
}

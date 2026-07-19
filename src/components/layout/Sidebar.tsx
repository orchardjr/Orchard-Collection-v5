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

      <nav className="mt-9 space-y-1.5" aria-label="Primary navigation">
        {navigationItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-sidebar-active text-sidebar-active-foreground shadow-sm before:absolute before:left-0 before:h-5 before:w-1 before:rounded-full before:bg-accent'
                  : 'text-muted-foreground hover:translate-x-0.5 hover:bg-surface-muted hover:text-foreground',
              )
            }
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="relative mt-auto overflow-hidden rounded-[1.25rem] border border-sidebar-border/80 bg-gradient-to-br from-surface-muted to-accent-soft/60 p-5 shadow-sm">
        <span
          className="absolute -right-5 -top-5 size-16 rounded-full bg-accent/10"
          aria-hidden="true"
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Seasonal note
        </p>
        <p className="relative mt-2.5 text-sm leading-6 text-muted-foreground">
          A place for every object, story, and memory.
        </p>
      </div>
    </aside>
  )
}

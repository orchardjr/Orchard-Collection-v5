import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const links = [
  ['Dashboard', '/feeders'],
  ['Colonies', '/feeders/colonies'],
  ['Crickets', '/feeders/crickets'],
  ['Inventory', '/feeders/inventory'],
  ['Maintenance', '/feeders/maintenance'],
  ['Harvests', '/feeders/harvests'],
  ['Feedings', '/feeders/feedings'],
  ['Scan', '/feeders/scan'],
  ['Settings', '/feeders/settings'],
] as const
export function FeederShell() {
  return (
    <div>
      <div className="sticky top-0 z-20 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur lg:top-[var(--topbar-height,0px)]">
        <nav
          className="mx-auto flex max-w-[1440px] gap-1 py-2"
          aria-label="Feeder Management"
        >
          {links.map(([label, path]) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/feeders'}
              className={({ isActive }) =>
                cn(
                  'min-h-11 shrink-0 rounded-xl px-3 py-3 text-sm font-semibold',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}

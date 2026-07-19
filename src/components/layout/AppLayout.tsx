import { Apple, Library } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { to: '/', label: 'Home', icon: Apple },
  { to: '/collection', label: 'Collection', icon: Library },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <header className="border-b border-white/10">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"
          aria-label="Main navigation"
        >
          <NavLink to="/" className="font-semibold tracking-tight">
            Orchard Collection
          </NavLink>
          <div className="flex gap-2">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-lime-300 text-stone-950'
                      : 'text-stone-400 hover:text-white'
                  }`
                }
              >
                <Icon aria-hidden="true" size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16">
        <Outlet />
      </main>
    </div>
  )
}

import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'

import { useUiStore, type ThemePreference } from '../../stores/uiStore'
import { Button } from '../ui/Button'

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function TopBar() {
  const theme = useUiStore((state) => state.theme)
  const setTheme = useUiStore((state) => state.setTheme)
  const toggleDrawer = useUiStore((state) => state.toggleDrawer)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <Button
        variant="ghost"
        className="size-10 px-0 lg:hidden"
        onClick={toggleDrawer}
        aria-label="Open navigation"
      >
        <Menu size={21} />
      </Button>
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={17}
        />
        <input
          type="search"
          placeholder="Search your collection…"
          className="h-11 w-full rounded-2xl border border-border/75 bg-surface pl-10 pr-4 text-sm text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <label className="relative flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-muted-foreground">
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="sr-only sm:not-sr-only">Theme</span>
          <select
            value={theme}
            onChange={(event) =>
              setTheme(event.target.value as ThemePreference)
            }
            className="appearance-none bg-transparent pr-2 text-sm font-medium text-foreground outline-none"
            aria-label="Color theme"
          >
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          className="size-10 px-0"
          aria-label="Notifications"
        >
          <Bell size={19} />
        </Button>
        <div
          className="grid size-9 place-items-center rounded-full bg-avatar text-xs font-bold text-avatar-foreground"
          aria-label="User profile"
        >
          OC
        </div>
      </div>
    </header>
  )
}

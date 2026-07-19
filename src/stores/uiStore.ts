import { create } from 'zustand'

export type ThemePreference = 'light' | 'dark' | 'system'

interface UiState {
  drawerOpen: boolean
  theme: ThemePreference
  closeDrawer: () => void
  setTheme: (theme: ThemePreference) => void
  toggleDrawer: () => void
}

function getInitialTheme(): ThemePreference {
  const savedTheme = localStorage.getItem('orchard-theme')
  return savedTheme === 'light' ||
    savedTheme === 'dark' ||
    savedTheme === 'system'
    ? savedTheme
    : 'system'
}

export const useUiStore = create<UiState>((set) => ({
  drawerOpen: false,
  theme: getInitialTheme(),
  closeDrawer: () => set({ drawerOpen: false }),
  setTheme: (theme) => set({ theme }),
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
}))

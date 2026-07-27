import {
  BarChart3,
  Boxes,
  Clapperboard,
  Clock3,
  LayoutDashboard,
  Library,
  ListTodo,
  Settings,
  ScanLine,
  Tags,
  Bug,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  path: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Collection', path: '/collection', icon: Library },
  { label: 'Scan', path: '/scan', icon: ScanLine },
  { label: 'Spaces', path: '/spaces', icon: Boxes },
  { label: 'Media', path: '/media', icon: Clapperboard },
  { label: 'Timeline', path: '/timeline', icon: Clock3 },
  { label: 'Tasks', path: '/tasks', icon: ListTodo },
  { label: 'Feeders', path: '/feeders', icon: Bug },
  { label: 'Label Studio', path: '/label-studio', icon: Tags },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
]

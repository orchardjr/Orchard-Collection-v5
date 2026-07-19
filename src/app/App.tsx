import { lazy, Suspense, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RepositoryErrorBoundary } from '../components/errors/RepositoryErrorBoundary'
import { AppLayout } from '../components/layout/AppLayout'
import { Skeleton } from '../components/ui/Skeleton'

const page = <T extends Record<K, ComponentType>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K,
) => lazy(() => loader().then((module) => ({ default: module[key] })))

const AnalyticsPage = page(
  () => import('../pages/AnalyticsPage'),
  'AnalyticsPage',
)
const CollectionPage = page(
  () => import('../pages/CollectionPage'),
  'CollectionPage',
)
const DashboardPage = page(
  () => import('../pages/DashboardPage'),
  'DashboardPage',
)
const LabelStudioPage = page(
  () => import('../pages/LabelStudioPage'),
  'LabelStudioPage',
)
const MediaPage = page(() => import('../pages/MediaPage'), 'MediaPage')
const PlantDetailsPage = page(
  () => import('../pages/PlantDetailsPage'),
  'PlantDetailsPage',
)
const NotFoundPage = page(
  () => import('../routes/NotFoundPage'),
  'NotFoundPage',
)
const SettingsPage = page(() => import('../pages/SettingsPage'), 'SettingsPage')
const SpacesPage = page(() => import('../pages/SpacesPage'), 'SpacesPage')
const TasksPage = page(() => import('../pages/TasksPage'), 'TasksPage')
const TimelinePage = page(() => import('../pages/TimelinePage'), 'TimelinePage')

function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-10 sm:px-6 lg:px-10">
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-80 border border-border/60" />
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="collection"
            element={
              <RepositoryErrorBoundary>
                <CollectionPage />
              </RepositoryErrorBoundary>
            }
          />
          <Route
            path="collection/:plantId"
            element={
              <RepositoryErrorBoundary>
                <PlantDetailsPage />
              </RepositoryErrorBoundary>
            }
          />
          <Route path="spaces" element={<SpacesPage />} />
          <Route
            path="media"
            element={
              <RepositoryErrorBoundary>
                <MediaPage />
              </RepositoryErrorBoundary>
            }
          />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="label-studio" element={<LabelStudioPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

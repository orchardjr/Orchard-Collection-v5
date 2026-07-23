import { lazy, Suspense, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'

import { RepositoryErrorBoundary } from '../components/errors/RepositoryErrorBoundary'
import { AuthGate } from '../auth/AuthGate'
import { AppLayout } from '../components/layout/AppLayout'
import { Skeleton } from '../components/ui/Skeleton'
import { LegacyImportGate } from '../migration/LegacyImportGate'

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
const FeederShell = page(
  () => import('../features/feeders/FeederShell'),
  'FeederShell',
)
const FeederDashboardPage = page(
  () => import('../pages/feeders/FeederDashboardPage'),
  'FeederDashboardPage',
)
const FeederColoniesPage = page(
  () => import('../pages/feeders/FeederRecordsPages'),
  'FeederColoniesPage',
)
const CricketBatchesPage = page(
  () => import('../pages/feeders/FeederRecordsPages'),
  'CricketBatchesPage',
)
const FeederInventoryPage = page(
  () => import('../pages/feeders/FeederRecordsPages'),
  'FeederInventoryPage',
)
const MaintenanceLogPage = page(
  () => import('../pages/feeders/FeederLogPages'),
  'MaintenanceLogPage',
)
const HarvestLogPage = page(
  () => import('../pages/feeders/FeederLogPages'),
  'HarvestLogPage',
)
const FeedingLogPage = page(
  () => import('../pages/feeders/FeederLogPages'),
  'FeedingLogPage',
)
const FeederScanPage = page(
  () => import('../pages/feeders/FeederScanPage'),
  'FeederScanPage',
)
const FeederSettingsPage = page(
  () => import('../pages/feeders/FeederSettingsPage'),
  'FeederSettingsPage',
)
const FeederDetailPage = page(
  () => import('../pages/feeders/FeederDetailPage'),
  'FeederDetailPage',
)
const DymoPrintPage = page(
  () => import('../pages/feeders/DymoPrintPage'),
  'DymoPrintPage',
)

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
    <AuthGate>
      <LegacyImportGate>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="feeders/print/:type/:id" element={<DymoPrintPage />} />
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
              <Route
                path="spaces"
                element={
                  <RepositoryErrorBoundary>
                    <SpacesPage />
                  </RepositoryErrorBoundary>
                }
              />
              <Route
                path="media"
                element={
                  <RepositoryErrorBoundary>
                    <MediaPage />
                  </RepositoryErrorBoundary>
                }
              />
              <Route
                path="timeline"
                element={
                  <RepositoryErrorBoundary>
                    <TimelinePage />
                  </RepositoryErrorBoundary>
                }
              />
              <Route
                path="tasks"
                element={
                  <RepositoryErrorBoundary>
                    <TasksPage />
                  </RepositoryErrorBoundary>
                }
              />
              <Route path="label-studio" element={<LabelStudioPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="feeders"
                element={
                  <RepositoryErrorBoundary>
                    <FeederShell />
                  </RepositoryErrorBoundary>
                }
              >
                <Route index element={<FeederDashboardPage />} />
                <Route path="colonies" element={<FeederColoniesPage />} />
                <Route path="colonies/:id" element={<FeederDetailPage />} />
                <Route path="crickets" element={<CricketBatchesPage />} />
                <Route path="crickets/:id" element={<FeederDetailPage />} />
                <Route path="inventory" element={<FeederInventoryPage />} />
                <Route path="inventory/:id" element={<FeederDetailPage />} />
                <Route path="maintenance" element={<MaintenanceLogPage />} />
                <Route path="harvests" element={<HarvestLogPage />} />
                <Route path="feedings" element={<FeedingLogPage />} />
                <Route path="scan" element={<FeederScanPage />} />
                <Route path="settings" element={<FeederSettingsPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </LegacyImportGate>
    </AuthGate>
  )
}

import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'
import { RepositoryErrorBoundary } from '../components/errors/RepositoryErrorBoundary'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { CollectionPage } from '../pages/CollectionPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LabelStudioPage } from '../pages/LabelStudioPage'
import { MediaPage } from '../pages/MediaPage'
import { PlantDetailsPage } from '../pages/PlantDetailsPage'
import { NotFoundPage } from '../routes/NotFoundPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SpacesPage } from '../pages/SpacesPage'
import { TasksPage } from '../pages/TasksPage'
import { TimelinePage } from '../pages/TimelinePage'

export function App() {
  return (
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
        <Route path="media" element={<MediaPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="label-studio" element={<LabelStudioPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

import { BarChart3 } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function AnalyticsPage() {
  return (
    <Page
      title="Analytics"
      subtitle="Understand growth, completeness, activity, and trends across your collection."
    >
      <EmptyState
        icon={BarChart3}
        title="See the bigger picture"
        description="Collection metrics and insights will be presented here."
      />
    </Page>
  )
}

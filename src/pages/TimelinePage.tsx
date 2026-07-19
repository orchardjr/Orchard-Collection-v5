import { Clock3 } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function TimelinePage() {
  return (
    <Page
      title="Timeline"
      subtitle="See how your collection and its stories have evolved over time."
    >
      <EmptyState
        icon={Clock3}
        title="A living history"
        description="Important dates and collection events will form your timeline."
      />
    </Page>
  )
}

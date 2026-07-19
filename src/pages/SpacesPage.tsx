import { Boxes } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function SpacesPage() {
  return (
    <Page
      title="Spaces"
      subtitle="Map where your collection is kept, from rooms to individual shelves."
    >
      <EmptyState
        icon={Boxes}
        title="Organize by place"
        description="Create spaces to make every item easy to locate."
      />
    </Page>
  )
}

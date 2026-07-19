import { Library } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function CollectionPage() {
  return (
    <Page
      title="Collection"
      subtitle="Browse, organize, and enrich every item in your archive."
      actions={<Button>Add item</Button>}
    >
      <EmptyState
        icon={Library}
        title="Your collection lives here"
        description="Collection browsing and cataloguing tools will appear in this workspace."
      />
    </Page>
  )
}

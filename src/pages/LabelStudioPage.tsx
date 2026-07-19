import { Tags } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function LabelStudioPage() {
  return (
    <Page
      title="Label Studio"
      subtitle="Design and print consistent labels for objects and spaces."
    >
      <EmptyState
        icon={Tags}
        title="Labels made simple"
        description="Choose fields, layouts, and print formats for your collection."
      />
    </Page>
  )
}

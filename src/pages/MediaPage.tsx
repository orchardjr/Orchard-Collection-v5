import { Clapperboard } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function MediaPage() {
  return (
    <Page
      title="Media"
      subtitle="Manage photographs, documents, audio, and video connected to your collection."
    >
      <EmptyState
        icon={Clapperboard}
        title="Your media library"
        description="Visual records and attachments will gather here."
      />
    </Page>
  )
}

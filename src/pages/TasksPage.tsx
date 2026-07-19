import { ListTodo } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'

export function TasksPage() {
  return (
    <Page
      title="Tasks"
      subtitle="Plan cataloguing, care, research, and other collection work."
    >
      <EmptyState
        icon={ListTodo}
        title="Stay gently on track"
        description="Tasks and reminders will help move collection work forward."
      />
    </Page>
  )
}

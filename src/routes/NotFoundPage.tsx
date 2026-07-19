import { Link } from 'react-router-dom'

import { Page } from '../components/ui/Page'

export function NotFoundPage() {
  return (
    <Page title="Page not found" subtitle="This path is a little overgrown.">
      <Link
        className="font-semibold text-accent hover:text-accent-strong"
        to="/"
      >
        Return to the dashboard
      </Link>
    </Page>
  )
}

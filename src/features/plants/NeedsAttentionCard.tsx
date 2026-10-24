import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { attentionFilters } from './collectionAttention'
import { useCollectionAttention } from './useCollectionAttention'

export function NeedsAttentionCard() {
  const { attention, loading, error, retry, local } = useCollectionAttention()
  const total = new Set(Object.values(attention).flatMap((ids) => [...ids]))
    .size
  return (
    <Card
      title="Needs attention"
      description="Active plants only · overdue care means due before today"
      className="mb-5"
    >
      {error ? (
        <div role="alert">
          <p>
            Attention information could not be loaded. Counts are unavailable.
          </p>
          <Button variant="secondary" onClick={() => void retry()}>
            Retry attention data
          </Button>
        </div>
      ) : loading ? (
        <p role="status">Checking your collection…</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total
              ? `${total} plants need attention. A plant can appear in more than one category.`
              : 'No missing information or overdue care found.'}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attentionFilters.map(({ id, label }) => (
              <Link
                key={id}
                to={`/collection?attention=${id}${local ? '&source=local' : ''}`}
                className="min-h-24 rounded-xl border border-border bg-background p-4 transition hover:border-accent hover:bg-accent-soft focus-visible:outline-accent"
              >
                <span className="block text-2xl font-semibold">
                  {attention[id].size}
                </span>
                <span className="mt-1 block text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No care schedule means neither a watering/fertilizing interval nor
            an open recurring care task. Dates that are unknown are not counted
            as overdue.
          </p>
        </>
      )}
    </Card>
  )
}

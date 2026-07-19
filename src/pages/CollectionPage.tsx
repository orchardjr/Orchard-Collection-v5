import { Leaf, PawPrint } from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Page } from '../components/ui/Page'
import { usePlants } from '../hooks/useOrchardData'
import type { PlantStatus } from '../models'

const statusStyles: Record<PlantStatus, string> = {
  thriving: 'bg-accent-soft text-accent',
  stable: 'bg-surface-muted text-muted-foreground',
  attention:
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

export function CollectionPage() {
  const { data: plants = [], isLoading } = usePlants()

  return (
    <Page
      title="Collection"
      subtitle="Browse, organize, and enrich every item in your living archive."
      actions={<Button>Add item</Button>}
    >
      {isLoading ? (
        <div
          className="h-64 animate-pulse rounded-2xl border border-border bg-surface"
          aria-label="Loading collection"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plants.map((plant) => {
            const Icon = plant.kind === 'animal' ? PawPrint : Leaf
            return (
              <article
                key={plant.id}
                className="group rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-accent/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyles[plant.status]}`}
                  >
                    {plant.status}
                  </span>
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                  {plant.commonName}
                </h2>
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {plant.scientificName}
                </p>
                {plant.notes && (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {plant.notes}
                  </p>
                )}
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  Acquired{' '}
                  {new Intl.DateTimeFormat(undefined, {
                    month: 'long',
                    year: 'numeric',
                  }).format(plant.acquiredAt)}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Page>
  )
}

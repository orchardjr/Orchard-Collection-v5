import {
  ArrowLeft,
  CalendarDays,
  Heart,
  Leaf,
  PawPrint,
  Store,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Card } from '../components/ui/Card'
import { Page } from '../components/ui/Page'
import { usePlant, usePlantTimeline } from '../hooks/useOrchardData'
import { getPlantDisplayName } from '../lib/plants'

export function PlantDetailsPage() {
  const { plantId } = useParams<{ plantId: string }>()
  const { data: plant, isLoading } = usePlant(plantId)
  const { data: timeline = [] } = usePlantTimeline(plantId)

  if (isLoading)
    return (
      <div
        className="mx-auto h-96 max-w-6xl animate-pulse rounded-2xl bg-surface m-6"
        aria-label="Loading plant"
      />
    )
  if (!plant)
    return (
      <Page
        title="Plant not found"
        subtitle="This plant may no longer be available."
      >
        <Link to="/collection" className="font-semibold text-accent">
          Return to collection
        </Link>
      </Page>
    )

  const Icon = plant.kind === 'animal' ? PawPrint : Leaf
  const displayName = getPlantDisplayName(plant)

  return (
    <Page
      title={displayName}
      subtitle={plant.scientificName}
      actions={
        <Link
          to="/collection"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <ArrowLeft size={16} />
          Collection
        </Link>
      }
    >
      <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
        <div className="grid min-h-72 place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--surface),transparent_40%),linear-gradient(145deg,var(--accent-soft),var(--surface-muted))] sm:min-h-96">
          {plant.heroImageUrl ? (
            <img
              src={plant.heroImageUrl}
              alt=""
              className="size-full max-h-[480px] object-cover"
            />
          ) : (
            <Icon size={74} strokeWidth={1} className="text-accent/70" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${plant.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-surface-muted text-muted-foreground'}`}
          >
            {plant.status}
          </span>
          {plant.favorite && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
              <Heart size={16} fill="currentColor" />
              Favorite
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="Identity" className="lg:col-span-3">
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              ['Nickname', plant.nickname || '—'],
              ['Scientific name', plant.scientificName],
              ['Common name', plant.commonName || '—'],
              ['Cultivar', plant.cultivar || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-5 border-t border-border pt-5 text-sm text-muted-foreground">
            {plant.vendor && (
              <span className="flex items-center gap-2">
                <Store size={16} />
                {plant.vendor}
              </span>
            )}
            {plant.purchaseDate && (
              <span className="flex items-center gap-2">
                <CalendarDays size={16} />
                Purchased{' '}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                }).format(plant.purchaseDate)}
              </span>
            )}
          </div>
        </Card>
        <Card title="Notes" className="lg:col-span-2">
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {plant.notes || 'No notes have been added yet.'}
          </p>
        </Card>
        <Card
          title="Timeline"
          description="History for this collection item"
          className="lg:col-span-5"
        >
          {timeline.length ? (
            <ol className="space-y-4">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {event.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(event.occurredAt)}
                    </p>
                    {event.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              No timeline events yet.
            </p>
          )}
        </Card>
      </div>
    </Page>
  )
}

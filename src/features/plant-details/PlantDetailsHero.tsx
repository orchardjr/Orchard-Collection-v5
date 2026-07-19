import { Heart, Leaf, PawPrint } from 'lucide-react'

import { getPlantDisplayName } from '../../lib/plants'
import type { Plant } from '../../models'

interface PlantDetailsHeroProps {
  plant: Plant
}

export function PlantDetailsHero({ plant }: PlantDetailsHeroProps) {
  const Icon = plant.kind === 'animal' ? PawPrint : Leaf

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="grid min-h-72 place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--surface),transparent_40%),linear-gradient(145deg,var(--accent-soft),var(--surface-muted))] sm:min-h-96">
        {plant.heroImageUrl ? (
          <img
            src={plant.heroImageUrl}
            alt={`${getPlantDisplayName(plant)} hero`}
            className="size-full max-h-[520px] object-cover"
          />
        ) : (
          <div className="text-center text-accent/70">
            <Icon size={76} strokeWidth={1} aria-hidden="true" />
            <span className="sr-only">No hero image</span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-end sm:p-7">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${plant.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-surface-muted text-muted-foreground'}`}
            >
              {plant.status}
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {getPlantDisplayName(plant)}
          </h1>
          <p className="mt-2 text-base italic text-muted-foreground">
            {plant.scientificName}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-sm font-semibold sm:self-auto ${plant.favorite ? 'border-red-200 bg-red-50 text-red-600' : 'border-border bg-background text-muted-foreground'}`}
        >
          <Heart
            size={17}
            fill={plant.favorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
          {plant.favorite ? 'Favorite' : 'Not a favorite'}
        </span>
      </div>
    </section>
  )
}

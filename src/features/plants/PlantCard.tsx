import { Archive, Heart, Leaf, Pencil, PawPrint } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Plant } from '../../models'
import { Button } from '../../components/ui/Button'
import { getPlantDisplayName } from '../../lib/plants'

interface PlantCardProps {
  plant: Plant
  onArchive: (plant: Plant) => void
  onEdit: (plant: Plant) => void
}

export function PlantCard({ onArchive, onEdit, plant }: PlantCardProps) {
  const Icon = plant.kind === 'animal' ? PawPrint : Leaf

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-accent/50">
      <Link
        to={`/collection/${plant.id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-accent-soft"
      >
        {plant.heroImageUrl ? (
          <img
            src={plant.heroImageUrl}
            alt=""
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--surface),transparent_45%),linear-gradient(145deg,var(--accent-soft),var(--surface-muted))]">
            <Icon
              size={46}
              strokeWidth={1.2}
              className="text-accent/70"
              aria-hidden="true"
            />
          </div>
        )}
        {plant.favorite && (
          <span
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 text-red-500 shadow-sm"
            aria-label="Favorite"
          >
            <Heart size={17} fill="currentColor" />
          </span>
        )}
        <span
          className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize shadow-sm ${plant.status === 'active' ? 'bg-accent text-accent-foreground' : 'bg-surface text-muted-foreground'}`}
        >
          {plant.status}
        </span>
      </Link>
      <div className="p-5">
        <Link to={`/collection/${plant.id}`}>
          <h2 className="font-display text-xl font-semibold text-foreground hover:text-accent">
            {getPlantDisplayName(plant)}
          </h2>
        </Link>
        <p className="mt-1 text-sm italic text-muted-foreground">
          {plant.scientificName}
        </p>
        <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
          <Button
            variant="ghost"
            className="px-3"
            onClick={() => onEdit(plant)}
          >
            <Pencil size={15} />
            Edit
          </Button>
          {plant.status === 'active' && (
            <Button
              variant="ghost"
              className="ml-auto px-3"
              onClick={() => onArchive(plant)}
            >
              <Archive size={15} />
              Archive
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

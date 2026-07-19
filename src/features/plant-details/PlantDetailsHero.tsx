import { Heart, Leaf, PawPrint } from 'lucide-react'
import { motion } from 'framer-motion'

import { Badge } from '../../components/ui/Badge'
import { getPlantDisplayName } from '../../lib/plants'
import type { Plant } from '../../models'
import type { MediaAsset } from '../../models'
import { OrchardImage } from '../media/OrchardImage'

interface PlantDetailsHeroProps {
  plant: Plant
  hero?: MediaAsset
}

export function PlantDetailsHero({ hero, plant }: PlantDetailsHeroProps) {
  const Icon = plant.kind === 'animal' ? PawPrint : Leaf

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-border/75 bg-surface shadow-card">
      <div className="grid min-h-72 place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--surface),transparent_40%),linear-gradient(145deg,var(--accent-soft),var(--surface-muted))] sm:min-h-96">
        {hero ? (
          <OrchardImage
            blob={hero.blob}
            thumbnailBlob={hero.thumbnailBlob}
            alt={`${getPlantDisplayName(plant)} hero`}
            className="size-full max-h-[520px] object-cover"
            imageClassName="object-cover"
          />
        ) : plant.heroImageUrl ? (
          <OrchardImage
            src={plant.heroImageUrl}
            alt={`${getPlantDisplayName(plant)} hero`}
            className="size-full max-h-[520px] object-cover"
            imageClassName="object-cover"
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
            <Badge
              variant={plant.status === 'active' ? 'accent' : 'neutral'}
              className="capitalize"
            >
              {plant.status}
            </Badge>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {getPlantDisplayName(plant)}
          </h1>
          <p className="mt-2 text-base italic text-muted-foreground">
            {plant.scientificName}
          </p>
        </div>
        <motion.span
          key={String(plant.favorite)}
          initial={{ scale: 0.94, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-2 text-sm font-semibold sm:self-auto ${plant.favorite ? 'border-red-200 bg-red-50 text-red-600' : 'border-border bg-background text-muted-foreground'}`}
        >
          <Heart
            size={17}
            fill={plant.favorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
          {plant.favorite ? 'Favorite' : 'Not a favorite'}
        </motion.span>
      </div>
    </section>
  )
}

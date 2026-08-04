import { Archive, Heart, Leaf, Pencil, PawPrint, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import type { MediaAsset, Plant } from '../../models'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { getPlantDisplayName } from '../../lib/plants'
import { OrchardImage } from '../media/OrchardImage'

interface PlantCardProps {
  plant: Plant
  media?: MediaAsset
  onArchive: (plant: Plant) => void
  onEdit: (plant: Plant) => void
  onRestore: (plant: Plant) => void
}

export function PlantCard({
  media,
  onArchive,
  onEdit,
  onRestore,
  plant,
}: PlantCardProps) {
  const Icon = plant.kind === 'animal' ? PawPrint : Leaf

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="group overflow-hidden rounded-[1.4rem] border border-border/75 bg-surface shadow-card transition-shadow hover:shadow-card-hover"
    >
      <Link
        to={`/collection/${plant.id}`}
        className="relative block aspect-[16/10] overflow-hidden bg-accent-soft"
      >
        {media ? (
          <OrchardImage
            blob={media.blob}
            thumbnailBlob={media.thumbnailBlob}
            src={media.signedUrl}
            thumbnailSrc={media.thumbnailUrl}
            alt={`${getPlantDisplayName(plant)} hero`}
            className="size-full"
            imageClassName="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : plant.heroImageUrl ? (
          <OrchardImage
            src={plant.heroImageUrl}
            alt={`${getPlantDisplayName(plant)} hero`}
            className="size-full"
            imageClassName="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
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
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 text-red-500 shadow-sm"
            aria-label="Favorite"
          >
            <Heart size={17} fill="currentColor" />
          </motion.span>
        )}
        <Badge
          variant={plant.status === 'active' ? 'accent' : 'neutral'}
          className="absolute bottom-3 left-3 capitalize shadow-sm"
        >
          {plant.status}
        </Badge>
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
          {plant.status === 'archived' && (
            <Button
              variant="ghost"
              className="ml-auto px-3"
              onClick={() => onRestore(plant)}
            >
              <RotateCcw size={15} />
              Restore plant
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  )
}

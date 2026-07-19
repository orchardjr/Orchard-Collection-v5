import { Heart, Images, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import {
  filterAndSortMedia,
  type MediaSort,
} from '../features/media/mediaSelectors'
import { MediaThumbnail } from '../features/media/MediaThumbnail'
import { MediaViewer } from '../features/media/MediaViewer'
import { useAllMedia, usePlants } from '../hooks/useOrchardData'
import { getPlantDisplayName } from '../lib/plants'

export function MediaPage() {
  const { data: media = [], isLoading: mediaLoading } = useAllMedia()
  const { data: plants = [], isLoading: plantsLoading } = usePlants()
  const [search, setSearch] = useState('')
  const [plantId, setPlantId] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<MediaSort>('uploadedAt')
  const [viewerId, setViewerId] = useState<string>()
  const plantMap = useMemo(
    () => new Map(plants.map((plant) => [plant.id, plant])),
    [plants],
  )
  const visible = useMemo(
    () =>
      filterAndSortMedia(media, plants, {
        favoritesOnly,
        plantId,
        search,
        sort,
      }),
    [favoritesOnly, media, plantId, plants, search, sort],
  )

  return (
    <Page
      title="Media"
      subtitle="Browse every local photo in your living collection."
    >
      <div className="mb-7 grid gap-3 rounded-[1.4rem] border border-border/75 bg-surface p-3 shadow-card md:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search media</span>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={17}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search plants, files, notes, or tags…"
            className="h-12 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </label>
        <Select label="Filter by plant" value={plantId} onChange={setPlantId}>
          <option value="">All plants</option>
          {plants.map((plant) => (
            <option key={plant.id} value={plant.id}>
              {getPlantDisplayName(plant)}
            </option>
          ))}
        </Select>
        <Select
          label="Sort media"
          value={sort}
          onChange={(value) => setSort(value as MediaSort)}
        >
          <option value="uploadedAt">Upload date</option>
          <option value="dateTaken">Date taken</option>
          <option value="plantName">Plant name</option>
        </Select>
        <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
            className="accent-[var(--accent)]"
          />
          <Heart size={16} /> Favorites
        </label>
      </div>

      {mediaLoading || plantsLoading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Loading media"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-square border border-border"
            />
          ))}
        </div>
      ) : visible.length ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Media gallery"
        >
          {visible.map((asset) => {
            const plant = plantMap.get(asset.plantId)
            return (
              <article
                key={asset.id}
                className="group overflow-hidden rounded-[1.4rem] border border-border bg-surface shadow-card"
              >
                <button
                  type="button"
                  onClick={() => setViewerId(asset.id)}
                  className="relative block aspect-square w-full overflow-hidden focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-accent/30"
                  aria-label={`Open ${asset.fileName} fullscreen`}
                >
                  <MediaThumbnail
                    asset={asset}
                    alt={asset.notes || asset.fileName}
                    className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  />
                  {asset.isHero && (
                    <Badge variant="accent" className="absolute left-3 top-3">
                      Hero
                    </Badge>
                  )}
                  {asset.isFavorite && (
                    <Heart
                      size={18}
                      fill="currentColor"
                      className="absolute right-3 top-3 text-red-500 drop-shadow"
                      aria-label="Favorite"
                    />
                  )}
                </button>
                <div className="p-4">
                  <p className="truncate text-sm font-semibold">
                    {asset.fileName}
                  </p>
                  {plant && (
                    <Link
                      to={`/collection/${plant.id}`}
                      className="mt-1 inline-block text-sm text-accent hover:underline"
                    >
                      {getPlantDisplayName(plant)}
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Images}
          title={
            media.length ? 'No matching photos' : 'Your media library is ready'
          }
          description={
            media.length
              ? 'Try adjusting the search or filters.'
              : 'Add photos from a plant’s Photos tab and they will appear here.'
          }
        />
      )}
      {viewerId && (
        <MediaViewer
          assets={visible}
          initialId={viewerId}
          onClose={() => setViewerId(undefined)}
        />
      )}
    </Page>
  )
}

function Select({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="flex h-12 items-center rounded-2xl border border-border bg-background px-3">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm font-semibold outline-none"
      >
        {children}
      </select>
    </label>
  )
}

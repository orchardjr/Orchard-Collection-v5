import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Plant, Space, MediaAsset } from '../../models'
import { OrchardImage } from '../media/OrchardImage'
import { selectPlantCardMedia } from '../media/mediaSelectors'
import type { PlantAssignmentTag } from '../tasks/usePlantAssignmentTags'

const PAGE_SIZE = 100

interface Props {
  plants: Plant[]
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  spaces?: Space[]
  media?: MediaAsset[]
  additive?: boolean
  plantTags?: PlantAssignmentTag[]
}

export function PlantBatchSelector({
  plants,
  selected,
  onChange,
  spaces,
  media = [],
  additive = false,
  plantTags = [],
}: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('active')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [spaceId, setSpaceId] = useState('')
  const [kind, setKind] = useState('')
  const [tag, setTag] = useState('')
  const images = useMemo(() => {
    const grouped = new Map<string, MediaAsset[]>()
    for (const asset of media)
      grouped.set(asset.plantId, [...(grouped.get(asset.plantId) ?? []), asset])
    return new Map(
      [...grouped].map(([id, assets]) => [id, selectPlantCardMedia(assets)]),
    )
  }, [media])
  const filtered = useMemo(
    () =>
      plants.filter((plant) => {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'favorites'
            ? plant.favorite && plant.status === 'active'
            : plant.status === filter)
        const text =
          `${plant.nickname} ${plant.scientificName} ${plant.commonName ?? ''}`.toLowerCase()
        return (
          matchesFilter &&
          (!spaceId || plant.spaceId === spaceId) &&
          (!kind || plant.kind === kind) &&
          (!tag ||
            plantTags.some(
              (link) => link.plantId === plant.id && link.name === tag,
            )) &&
          text.includes(search.toLowerCase())
        )
      }),
    [filter, plants, search, spaceId, kind, tag, plantTags],
  )
  const visiblePlants = filtered.slice(0, visibleCount)

  const selectFiltered = () =>
    onChange(
      new Set([...(additive ? selected : []), ...filtered.map(({ id }) => id)]),
    )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <span className="sr-only">Search plants</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            placeholder="Search plants"
            className="min-h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-3 focus:outline-2 focus:outline-accent"
          />
        </label>
        <select
          aria-label="Filter plants"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          className="min-h-11 rounded-xl border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="active">Active plants</option>
          <option value="favorites">Favorites</option>
          <option value="archived">Archived</option>
          <option value="all">Entire collection</option>
        </select>
      </div>
      {spaces && (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            aria-label="Assignment space"
            className="min-h-11 min-w-0 rounded-xl border border-border bg-surface px-3"
            value={spaceId}
            onChange={(e) => {
              setSpaceId(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
          >
            <option value="">All spaces</option>
            {spaces
              .filter((space) => !space.archivedAt)
              .map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
          </select>
          <select
            aria-label="Assignment category"
            className="min-h-11 min-w-0 rounded-xl border border-border bg-surface px-3"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
          >
            <option value="">All categories</option>
            <option value="plant">Plants</option>
            <option value="animal">Animals</option>
          </select>
        </div>
      )}
      {plantTags.length > 0 && (
        <select
          aria-label="Assignment tag"
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-3"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
        >
          <option value="">All tags</option>
          {[...new Set(plantTags.map((link) => link.name))]
            .sort()
            .map((name) => (
              <option key={name}>{name}</option>
            ))}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectFiltered}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          Select filtered ({filtered.length})
        </button>
        <span aria-hidden="true" className="text-border">
          •
        </span>
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="min-h-11 rounded-lg px-2 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-accent"
        >
          Clear selection
        </button>
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
        {visiblePlants.map((plant) => (
          <label
            key={plant.id}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-surface-muted focus-within:outline-2 focus-within:outline-accent"
          >
            <input
              type="checkbox"
              checked={selected.has(plant.id)}
              onChange={() => {
                const next = new Set(selected)
                if (next.has(plant.id)) next.delete(plant.id)
                else next.add(plant.id)
                onChange(next)
              }}
              className="size-4 accent-accent"
            />
            {images.get(plant.id) && (
              <OrchardImage
                alt=""
                thumbnailBlob={images.get(plant.id)?.thumbnailBlob}
                thumbnailSrc={images.get(plant.id)?.thumbnailUrl}
                blob={images.get(plant.id)?.blob}
                src={images.get(plant.id)?.signedUrl}
                className="size-10 shrink-0 rounded-lg"
                imageClassName="object-cover"
              />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {plant.nickname}
              </span>
              <span className="block truncate text-xs italic text-muted-foreground">
                {plant.scientificName}
              </span>
            </span>
          </label>
        ))}
        {!filtered.length && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No plants match this view.
          </p>
        )}
        {visiblePlants.length < filtered.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="min-h-11 w-full rounded-lg text-sm font-semibold text-accent hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visiblePlants.length)}{' '}
            more
          </button>
        )}
      </div>
      {filtered.length > PAGE_SIZE && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Showing {visiblePlants.length} of {filtered.length} matching plants.
        </p>
      )}
    </div>
  )
}

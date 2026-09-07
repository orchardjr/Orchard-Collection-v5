import { Filter, Leaf, Plus, Printer, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlantTaskDialog } from '../features/tasks/PlantTaskDialog'
import { usePlantAssignmentTags } from '../features/tasks/usePlantAssignmentTags'

import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import type { CreateInput } from '../db/repositories'
import { PlantCard } from '../features/plants/PlantCard'
import { PlantFormDialog } from '../features/plants/PlantFormDialog'
import {
  filterCollectionPlants,
  type PlantStatusFilter,
} from '../features/plants/plantFilters'
import { selectPlantCardMedia } from '../features/media/mediaSelectors'
import {
  useAllMedia,
  usePlantMutations,
  usePlants,
  useSpaces,
} from '../hooks/useOrchardData'
import type { Plant } from '../models'

type CollectionSort = 'nickname' | 'scientificName' | 'createdAt'

export function CollectionPage() {
  const navigate = useNavigate()
  const { data: plants = [], isLoading } = usePlants()
  const { data: media = [], isLoading: mediaLoading } = useAllMedia()
  const { data: spaces = [] } = useSpaces()
  const { archivePlant, createPlant, resetErrors, restorePlant, updatePlant } =
    usePlantMutations()
  const [search, setSearch] = useState('')
  const { data: plantTags = [] } = usePlantAssignmentTags()
  const [spaceFilter, setSpaceFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addingTask, setAddingTask] = useState(false)
  const [filter, setFilter] = useState<PlantStatusFilter>('active')
  const [sort, setSort] = useState<CollectionSort>('nickname')
  const [dialogPlant, setDialogPlant] = useState<Plant | null | undefined>()

  const visiblePlants = useMemo(() => {
    return filterCollectionPlants(plants, filter, search)
      .filter(
        (plant) =>
          (!spaceFilter || plant.spaceId === spaceFilter) &&
          (!tagFilter ||
            plantTags.some(
              (link) => link.plantId === plant.id && link.name === tagFilter,
            )),
      )
      .sort((first, second) => {
        if (sort === 'createdAt')
          return second.createdAt.getTime() - first.createdAt.getTime()
        return first[sort].localeCompare(second[sort], undefined, {
          sensitivity: 'base',
        })
      })
  }, [filter, plants, search, sort, spaceFilter, tagFilter, plantTags])

  const openDialog = (plant: Plant | null) => {
    resetErrors()
    setDialogPlant(plant)
  }
  const closeDialog = () => {
    resetErrors()
    setDialogPlant(undefined)
  }
  const savePlant = async (input: CreateInput<Plant>) => {
    if (dialogPlant)
      await updatePlant.mutateAsync({ id: dialogPlant.id, input })
    else await createPlant.mutateAsync(input)
    closeDialog()
  }

  const archive = async (plant: Plant) => {
    if (
      window.confirm(
        `Archive ${plant.nickname || plant.scientificName}? You can still find it with the Archived filter.`,
      )
    ) {
      try {
        await archivePlant.mutateAsync(plant.id)
      } catch {
        // The mutation error is rendered below the collection controls.
      }
    }
  }

  const restore = async (plant: Plant) => {
    try {
      await restorePlant.mutateAsync(plant.id)
    } catch {
      // The mutation error is rendered below the collection controls.
    }
  }

  const mutationError =
    createPlant.error ??
    updatePlant.error ??
    archivePlant.error ??
    restorePlant.error

  return (
    <Page
      title="Collection"
      subtitle="Browse, organize, and enrich every item in your living archive."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setSelecting(!selecting)
              setSelected(new Set())
            }}
          >
            {selecting ? 'Cancel selection' : 'Select'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/collection/print')}
          >
            <Printer size={17} />
            Print Collection
          </Button>
          <Button onClick={() => openDialog(null)}>
            <Plus size={17} />
            Add plant
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              navigate('/collection/labels', {
                state: {
                  filteredIds: visiblePlants.map((plant) => plant.id),
                  selectedIds: [...selected],
                  initialSource:
                    selecting && selected.size ? 'selected' : 'filtered',
                },
              })
            }
          >
            <Printer size={17} />
            Plant Labels
          </Button>
        </div>
      }
    >
      <div className="mb-7 grid gap-3 rounded-[1.4rem] border border-border/75 bg-surface p-3 shadow-card md:grid-cols-[minmax(240px,1fr)_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search plants</span>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={17}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or cultivar…"
            className="h-12 w-full rounded-2xl border border-border/75 bg-background pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
          />
        </label>
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-border/75 bg-background px-3.5 text-sm text-muted-foreground focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
          <Filter size={16} />
          <span className="sr-only">Filter</span>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as PlantStatusFilter)
            }
            className="bg-transparent font-medium text-foreground outline-none"
          >
            <option value="active">Active plants</option>
            <option value="archived">Archived</option>
            <option value="all">All plants</option>
          </select>
        </label>
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-border/75 bg-background px-3.5 text-sm text-muted-foreground focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
          Sort by
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as CollectionSort)}
            className="bg-transparent font-medium text-foreground outline-none"
          >
            <option value="nickname">Nickname</option>
            <option value="scientificName">Scientific name</option>
            <option value="createdAt">Date added</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          aria-label="Collection space"
          className="min-h-11 min-w-0 rounded-xl border border-border bg-surface px-3"
          value={spaceFilter}
          onChange={(e) => setSpaceFilter(e.target.value)}
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
        {plantTags.length > 0 && (
          <select
            aria-label="Collection tag"
            className="min-h-11 min-w-0 rounded-xl border border-border bg-surface px-3"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All tags</option>
            {[...new Set(plantTags.map((link) => link.name))]
              .sort()
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
        )}
      </div>
      {selecting && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-3 shadow-card">
          <span className="text-sm font-semibold">
            {selected.size} selected
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              setSelected(new Set(visiblePlants.map((plant) => plant.id)))
            }
          >
            Select all filtered plants
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <Button disabled={!selected.size} onClick={() => setAddingTask(true)}>
            <Plus size={16} />
            Add task
          </Button>
        </div>
      )}
      {addingTask && (
        <PlantTaskDialog
          plantIds={[...selected]}
          onClose={() => setAddingTask(false)}
          onSaved={() => {
            setSelecting(false)
            setSelected(new Set())
          }}
        />
      )}
      {dialogPlant === undefined && mutationError instanceof Error && (
        <p
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {mutationError.message}
        </p>
      )}

      {isLoading || mediaLoading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading collection"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-80 border border-border/60" />
          ))}
        </div>
      ) : visiblePlants.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePlants.map((plant) => (
            <div key={plant.id} className="min-w-0">
              {selecting && (
                <label className="mb-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-5 accent-accent"
                    checked={selected.has(plant.id)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current)
                        if (next.has(plant.id)) next.delete(plant.id)
                        else next.add(plant.id)
                        return next
                      })
                    }
                  />
                  Select {plant.nickname || plant.scientificName}
                </label>
              )}
              <PlantCard
                key={plant.id}
                plant={plant}
                media={selectPlantCardMedia(
                  media.filter((asset) => asset.plantId === plant.id),
                )}
                onArchive={archive}
                onEdit={openDialog}
                onRestore={restore}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Leaf}
          title={
            plants.length
              ? 'No matching plants'
              : 'Your collection is ready to grow'
          }
          description={
            plants.length
              ? 'Try another search or filter.'
              : 'Add your first plant to begin the collection.'
          }
        />
      )}

      {dialogPlant !== undefined && (
        <PlantFormDialog
          key={dialogPlant?.id ?? 'new'}
          plant={dialogPlant ?? undefined}
          spaces={spaces}
          saving={createPlant.isPending || updatePlant.isPending}
          errorMessage={
            mutationError instanceof Error ? mutationError.message : undefined
          }
          onClose={closeDialog}
          onSave={savePlant}
        />
      )}
    </Page>
  )
}

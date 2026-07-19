import { Filter, Leaf, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import type { CreateInput } from '../db/repositories'
import { PlantCard } from '../features/plants/PlantCard'
import { PlantFormDialog } from '../features/plants/PlantFormDialog'
import { usePlantMutations, usePlants } from '../hooks/useOrchardData'
import type { Plant } from '../models'

type CollectionFilter = 'all' | 'favorites' | 'active' | 'archived'
type CollectionSort = 'nickname' | 'scientificName' | 'createdAt'

export function CollectionPage() {
  const { data: plants = [], isLoading } = usePlants()
  const { archivePlant, createPlant, resetErrors, updatePlant } =
    usePlantMutations()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CollectionFilter>('all')
  const [sort, setSort] = useState<CollectionSort>('nickname')
  const [dialogPlant, setDialogPlant] = useState<Plant | null | undefined>()

  const visiblePlants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return plants
      .filter((plant) => {
        const matchesSearch =
          !query ||
          [
            plant.nickname,
            plant.scientificName,
            plant.commonName,
            plant.cultivar,
          ].some((value) => value?.toLocaleLowerCase().includes(query))
        const matchesFilter =
          filter === 'all' ||
          (filter === 'favorites' ? plant.favorite : plant.status === filter)
        return matchesSearch && matchesFilter
      })
      .sort((first, second) => {
        if (sort === 'createdAt')
          return second.createdAt.getTime() - first.createdAt.getTime()
        return first[sort].localeCompare(second[sort], undefined, {
          sensitivity: 'base',
        })
      })
  }, [filter, plants, search, sort])

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

  const mutationError =
    createPlant.error ?? updatePlant.error ?? archivePlant.error

  return (
    <Page
      title="Collection"
      subtitle="Browse, organize, and enrich every item in your living archive."
      actions={
        <Button onClick={() => openDialog(null)}>
          <Plus size={17} />
          Add plant
        </Button>
      }
    >
      <div className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card md:grid-cols-[minmax(240px,1fr)_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search plants</span>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={17}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or cultivar…"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
          <Filter size={16} />
          <span className="sr-only">Filter</span>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as CollectionFilter)
            }
            className="bg-transparent font-medium text-foreground outline-none"
          >
            <option value="all">All plants</option>
            <option value="favorites">Favorites</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
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

      {dialogPlant === undefined && mutationError instanceof Error && (
        <p
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {mutationError.message}
        </p>
      )}

      {isLoading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading collection"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : visiblePlants.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onArchive={archive}
              onEdit={openDialog}
            />
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

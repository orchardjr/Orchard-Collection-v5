import { Archive, ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Page } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import { CareTab } from '../features/plant-details/tabs/CareTab'
import { NotesTab } from '../features/plant-details/tabs/NotesTab'
import { OverviewTab } from '../features/plant-details/tabs/OverviewTab'
import { PhotosTab } from '../features/plant-details/tabs/PhotosTab'
import {
  PropertiesTab,
  type DynamicProperty,
} from '../features/plant-details/tabs/PropertiesTab'
import { TimelineTab } from '../features/plant-details/tabs/TimelineTab'
import { TasksTab } from '../features/plant-details/tabs/TasksTab'
import { PlantDetailsHero } from '../features/plant-details/PlantDetailsHero'
import { NfcTagSection } from '../features/nfc/NfcTagSection'
import {
  PlantDetailsTabs,
  type PlantDetailsTabId,
} from '../features/plant-details/PlantDetailsTabs'
import {
  usePlant,
  usePlantNfcTag,
  useNfcTagMutations,
  usePlantMedia,
  usePlantMutations,
  usePlantTimeline,
  usePlants,
  useSpaces,
  useTasks,
} from '../hooks/useOrchardData'

export function PlantDetailsPage() {
  const { plantId } = useParams<{ plantId: string }>()
  const navigate = useNavigate()
  const { data: plant, isLoading } = usePlant(plantId)
  const { data: timeline = [], isLoading: timelineLoading } =
    usePlantTimeline(plantId)
  const { data: media = [], isLoading: mediaLoading } = usePlantMedia(plantId)
  const { archivePlant, deletePlant, restorePlant, updatePlant } =
    usePlantMutations()
  const { data: spaces = [] } = useSpaces()
  const { data: tasks = [] } = useTasks()
  const { data: plants = [] } = usePlants()
  const {
    data: nfcTag,
    error: nfcLoadError,
    isLoading: nfcLoading,
  } = usePlantNfcTag(plantId)
  const { assignTag, replaceTag, unassignTag } = useNfcTagMutations()
  const [activeTab, setActiveTab] = useState<PlantDetailsTabId>('overview')

  const archive = async () => {
    if (!plant) return
    if (
      window.confirm(
        `Archive ${plant.nickname || plant.scientificName}? It will remain available through the Archived filter.`,
      )
    ) {
      try {
        await archivePlant.mutateAsync(plant.id)
      } catch {
        // The mutation error is rendered below the hero.
      }
    }
  }

  const restore = async () => {
    if (!plant) return
    try {
      await restorePlant.mutateAsync(plant.id)
    } catch {
      // The mutation error is rendered below the hero.
    }
  }

  const remove = async () => {
    if (!plant) return
    const confirmed = window.confirm(
      `Delete ${plant.nickname || plant.scientificName} permanently? This permanently removes the plant and related media, Storage files, NFC assignments, timeline records, and plant-specific tasks. This cannot be undone.`,
    )
    if (!confirmed) return
    try {
      await deletePlant.mutateAsync(plant.id)
      navigate('/collection', { replace: true })
    } catch {
      // The mutation error is rendered below the hero.
    }
  }

  if (isLoading) return <PlantDetailsLoading />
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

  const lifecycleError =
    archivePlant.error ?? restorePlant.error ?? deletePlant.error

  const dynamicProperties: DynamicProperty[] = [
    { id: 'record-id', label: 'Record ID', value: plant.id },
    {
      id: 'kind',
      label: 'Collection type',
      value: <span className="capitalize">{plant.kind}</span>,
    },
    { id: 'space', label: 'Space ID', value: plant.spaceId },
    {
      id: 'hero',
      label: 'Hero image',
      value: plant.heroMediaId || plant.heroImageUrl ? 'Set' : 'Not set',
    },
  ]

  const content: Record<PlantDetailsTabId, ReactNode> = {
    overview: (
      <div className="space-y-6">
        <OverviewTab
          plant={plant}
          spaceName={spaces.find((space) => space.id === plant.spaceId)?.name}
        />
        <NfcTagSection
          plantName={plant.nickname}
          tag={nfcTag ?? undefined}
          loading={nfcLoading}
          loadError={nfcLoadError}
          pending={
            assignTag.isPending || replaceTag.isPending || unassignTag.isPending
          }
          error={
            (assignTag.error ?? replaceTag.error ?? unassignTag.error)?.message
          }
          onResetError={() => {
            assignTag.reset()
            replaceTag.reset()
            unassignTag.reset()
          }}
          onAssign={(input) =>
            assignTag
              .mutateAsync({
                ...input,
                resourceType: 'plant',
                resourceId: plant.id,
              })
              .then(() => undefined)
          }
          onReplace={() =>
            replaceTag
              .mutateAsync({
                id: nfcTag!.id,
                nickname: nfcTag?.nickname,
                notes: nfcTag?.notes,
              })
              .then(() => undefined)
          }
          onRemove={() =>
            unassignTag.mutateAsync(nfcTag!.id).then(() => undefined)
          }
        />
      </div>
    ),
    timeline: timelineLoading ? (
      <TabLoading label="timeline" />
    ) : (
      <TimelineTab events={timeline} />
    ),
    tasks: (
      <TasksTab
        plant={plant}
        tasks={tasks.filter((task) => task.plantId === plant.id)}
        plants={plants}
        spaces={spaces}
      />
    ),
    photos: mediaLoading ? (
      <TabLoading label="photos" />
    ) : (
      <PhotosTab plantId={plant.id} media={media} />
    ),
    care: <CareTab plant={plant} />,
    notes: (
      <NotesTab
        notes={plant.notes ?? ''}
        onSave={async (notes) => {
          await updatePlant.mutateAsync({ id: plant.id, input: { notes } })
        }}
      />
    ),
    properties: <PropertiesTab properties={dynamicProperties} />,
  }

  return (
    <Page
      title="Plant details"
      subtitle="The complete record for this collection item"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to="/collection"
            className="inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-accent"
          >
            <ArrowLeft size={16} />
            Collection
          </Link>
          {plant.status === 'active' ? (
            <Button
              variant="secondary"
              disabled={archivePlant.isPending}
              onClick={() => void archive()}
            >
              <Archive size={16} /> Archive plant
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={restorePlant.isPending}
              onClick={() => void restore()}
            >
              <RotateCcw size={16} /> Restore plant
            </Button>
          )}
          <Button
            variant="danger"
            disabled={deletePlant.isPending}
            onClick={() => void remove()}
          >
            <Trash2 size={16} /> Delete plant
          </Button>
        </div>
      }
    >
      <PlantDetailsHero
        plant={plant}
        hero={media.find((asset) => asset.isHero) ?? media[0]}
      />
      {lifecycleError instanceof Error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {lifecycleError.message}
        </p>
      )}
      <div className="mt-6">
        <PlantDetailsTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.18 }}
          id={`plant-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`plant-tab-${activeTab}`}
          tabIndex={0}
          className="mt-6 focus:outline-none"
        >
          {content[activeTab]}
        </motion.section>
      </AnimatePresence>
    </Page>
  )
}

function PlantDetailsLoading() {
  return (
    <div
      className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 sm:py-10 lg:px-10"
      aria-label="Loading plant details"
    >
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-96 border border-border/60" />
      <Skeleton className="h-64 border border-border/60" />
    </div>
  )
}

function TabLoading({ label }: { label: string }) {
  return (
    <Skeleton
      className="h-64 border border-border/60"
      aria-label={`Loading ${label}`}
    />
  )
}

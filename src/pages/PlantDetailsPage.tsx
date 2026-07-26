import { ArrowLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

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
  const { data: plant, isLoading } = usePlant(plantId)
  const { data: timeline = [], isLoading: timelineLoading } =
    usePlantTimeline(plantId)
  const { data: media = [], isLoading: mediaLoading } = usePlantMedia(plantId)
  const { updatePlant } = usePlantMutations()
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
        <Link
          to="/collection"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent"
        >
          <ArrowLeft size={16} />
          Collection
        </Link>
      }
    >
      <PlantDetailsHero
        plant={plant}
        hero={media.find((asset) => asset.isHero) ?? media[0]}
      />
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

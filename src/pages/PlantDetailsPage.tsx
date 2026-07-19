import { ArrowLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Page } from '../components/ui/Page'
import { CareTab } from '../features/plant-details/tabs/CareTab'
import { NotesTab } from '../features/plant-details/tabs/NotesTab'
import { OverviewTab } from '../features/plant-details/tabs/OverviewTab'
import { PhotosTab } from '../features/plant-details/tabs/PhotosTab'
import {
  PropertiesTab,
  type DynamicProperty,
} from '../features/plant-details/tabs/PropertiesTab'
import { TimelineTab } from '../features/plant-details/tabs/TimelineTab'
import { PlantDetailsHero } from '../features/plant-details/PlantDetailsHero'
import {
  PlantDetailsTabs,
  type PlantDetailsTabId,
} from '../features/plant-details/PlantDetailsTabs'
import {
  usePlant,
  usePlantMedia,
  usePlantMutations,
  usePlantTimeline,
} from '../hooks/useOrchardData'

export function PlantDetailsPage() {
  const { plantId } = useParams<{ plantId: string }>()
  const { data: plant, isLoading } = usePlant(plantId)
  const { data: timeline = [], isLoading: timelineLoading } =
    usePlantTimeline(plantId)
  const { data: media = [], isLoading: mediaLoading } = usePlantMedia(plantId)
  const { updatePlant } = usePlantMutations()
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
      value: plant.heroImageUrl ? 'Set' : 'Not set',
    },
  ]

  const content: Record<PlantDetailsTabId, ReactNode> = {
    overview: <OverviewTab plant={plant} />,
    timeline: timelineLoading ? (
      <TabLoading label="timeline" />
    ) : (
      <TimelineTab events={timeline} />
    ),
    photos: mediaLoading ? (
      <TabLoading label="photos" />
    ) : (
      <PhotosTab media={media} />
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
      <PlantDetailsHero plant={plant} />
      <div className="mt-6">
        <PlantDetailsTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <section
        id={`plant-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`plant-tab-${activeTab}`}
        tabIndex={0}
        className="mt-6 focus:outline-none"
      >
        {content[activeTab]}
      </section>
    </Page>
  )
}

function PlantDetailsLoading() {
  return (
    <div
      className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-10"
      aria-label="Loading plant details"
    >
      <div className="h-12 w-64 animate-pulse rounded-xl bg-surface" />
      <div className="h-96 animate-pulse rounded-3xl border border-border bg-surface" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  )
}

function TabLoading({ label }: { label: string }) {
  return (
    <div
      className="h-64 animate-pulse rounded-2xl border border-border bg-surface"
      aria-label={`Loading ${label}`}
    />
  )
}

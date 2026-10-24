import { useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import type { MediaAsset, Plant } from '../../models'
import { PlantTaskDialog } from '../tasks/PlantTaskDialog'
import { usePlantHealth } from './usePlantHealth'
import { healthHistory, healthStatuses, type HealthStatus } from './plantHealth'

export function HealthTab({
  plant,
  media,
  onPhotos,
}: {
  plant: Plant
  media: MediaAsset[]
  onPhotos: () => void
}) {
  const query = usePlantHealth()
  const history = healthHistory(query.data ?? [], plant.id)
  const current = history[0]?.metadata?.healthStatus as HealthStatus | undefined
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<HealthStatus>('monitoring')
  const [notes, setNotes] = useState('')
  const [mediaId, setMediaId] = useState('')
  const [followUp, setFollowUp] = useState(false)
  const [saved, setSaved] = useState(false)
  const busy = useRef(false)
  const field =
    'mt-2 w-full min-w-0 min-h-11 rounded-xl border border-border bg-background p-3 text-sm'
  if (query.isPending) return <p role="status">Loading health history…</p>
  if (query.error)
    return (
      <Card title="Health & treatment">
        <p role="alert">
          Health history could not be loaded. Your saved records have not
          changed.
        </p>
        <Button onClick={() => void query.refetch()}>
          Retry health history
        </Button>
      </Card>
    )
  return (
    <div className="space-y-5">
      <Card
        title="Health & treatment"
        description="Track your observations, symptoms, pests and treatments. Health is separate from Active / Archived."
      >
        <p className="mb-4 font-semibold">
          Current status: {current ? healthStatuses[current] : 'Not recorded'}
        </p>
        {!editing ? (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setStatus(current ?? 'monitoring')
                setNotes('')
                setMediaId('')
                setSaved(false)
                query.save.reset()
                setEditing(true)
              }}
            >
              Record health update
            </Button>
            <Button variant="secondary" onClick={onPhotos}>
              Add progress photos
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (busy.current) return
              busy.current = true
              try {
                await query.save.mutateAsync({
                  plantId: plant.id,
                  status,
                  notes,
                  mediaId: mediaId || undefined,
                })
                setEditing(false)
                setSaved(true)
              } catch {
                /* Keep the form and display the mutation error. */
              } finally {
                busy.current = false
              }
            }}
          >
            <label className="block text-sm">
              Health status
              <select
                className={field}
                value={status}
                disabled={query.save.isPending}
                onChange={(e) => setStatus(e.target.value as HealthStatus)}
              >
                {Object.entries(healthStatuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Symptoms, pests, treatment and progress notes
              <textarea
                className={field}
                rows={5}
                maxLength={10000}
                value={notes}
                disabled={query.save.isPending}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Link an existing progress photo
              <select
                className={field}
                value={mediaId}
                disabled={query.save.isPending}
                onChange={(e) => setMediaId(e.target.value)}
              >
                <option value="">No photo</option>
                {media
                  .filter((asset) => asset.plantId === plant.id)
                  .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.fileName}
                    </option>
                  ))}
              </select>
            </label>
            <p className="text-sm text-muted-foreground">
              Use the Photos tab to upload a new image before recording your
              update. This log records what you did; it does not recommend
              treatments.
            </p>
            {query.save.error && <p role="alert">{query.save.error.message}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={query.save.isPending}>
                {query.save.isPending ? 'Saving…' : 'Save health update'}
              </Button>
              <Button
                variant="secondary"
                disabled={query.save.isPending}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
        {saved && (
          <p role="status" className="mt-4 text-sm">
            Health update saved. You can now add a follow-up task.
          </p>
        )}
        {!editing && (
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => setFollowUp(true)}
          >
            Add follow-up task
          </Button>
        )}
        {followUp && (
          <PlantTaskDialog
            plantIds={[plant.id]}
            initialValues={{
              title: `Health follow-up: ${plant.nickname || plant.scientificName}`,
              type: 'inspect',
            }}
            onClose={() => setFollowUp(false)}
          />
        )}
      </Card>
      <Card
        title="Health history"
        description="Newest observation first. Entries also appear in Timeline, where they can be edited or deleted."
      >
        {!history.length && (
          <p className="text-sm text-muted-foreground">
            No health observations recorded yet.
          </p>
        )}
        <ol className="space-y-4">
          {history.map((event) => (
            <li key={event.id} className="border-b border-border pb-4">
              <p className="font-semibold">
                {healthStatuses[event.metadata!.healthStatus as HealthStatus]}
              </p>
              <time
                className="text-xs text-muted-foreground"
                dateTime={event.occurredAt.toISOString()}
              >
                {event.occurredAt.toLocaleString()}
              </time>
              {event.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                  {event.description}
                </p>
              )}
              {event.metadata?.mediaId && (
                <p className="mt-2 text-sm">
                  {media.some(
                    (asset) => asset.id === event.metadata!.mediaId,
                  ) ? (
                    <Button variant="ghost" onClick={onPhotos}>
                      View linked photo:{' '}
                      {
                        media.find(
                          (asset) => asset.id === event.metadata!.mediaId,
                        )?.fileName
                      }
                    </Button>
                  ) : (
                    'Linked photo is no longer available.'
                  )}
                </p>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}

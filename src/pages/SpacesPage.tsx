import { Archive, Boxes, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import { Skeleton } from '../components/ui/Skeleton'
import type { CreateInput } from '../db/repositories'
import { SpaceFormDialog } from '../features/spaces/SpaceFormDialog'
import {
  usePlants,
  useSpaceMutations,
  useSpaces,
} from '../hooks/useOrchardData'
import type { Space } from '../models'
export function SpacesPage() {
  const { data: spaces = [], isLoading } = useSpaces()
  const { data: plants = [] } = usePlants()
  const m = useSpaceMutations()
  const [editing, setEditing] = useState<Space | null>()
  const [selected, setSelected] = useState<string>()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [archived, setArchived] = useState(false)
  const visible = useMemo(
    () =>
      spaces.filter(
        (s) =>
          (archived || !s.archivedAt) &&
          (!type || s.type === type) &&
          `${s.name} ${s.description ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [archived, search, spaces, type],
  )
  const error = Object.values(m).find((x) => x.error instanceof Error)?.error
  const save = async (input: CreateInput<Space>) => {
    if (editing) await m.updateSpace.mutateAsync({ id: editing.id, input })
    else await m.createSpace.mutateAsync(input)
    setEditing(undefined)
  }
  const detail = spaces.find((s) => s.id === selected)
  return (
    <Page
      title="Spaces"
      subtitle="Map every physical location in your collection."
      actions={
        <Button onClick={() => setEditing(null)}>
          <Plus size={17} />
          Add space
        </Button>
      }
    >
      <div className="mb-6 grid gap-2 rounded-2xl border border-border bg-surface p-3 md:grid-cols-3">
        <input
          aria-label="Search spaces"
          placeholder="Search spaces…"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Space type"
          className="h-11 rounded-xl border border-border bg-background px-3"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All types</option>
          {[...new Set(spaces.map((s) => s.type))].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 text-sm">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>
      {error instanceof Error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">
          {error.message}
        </p>
      )}
      {isLoading ? (
        <Skeleton className="h-72" />
      ) : visible.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((space) => (
            <Card
              key={space.id}
              title={space.name}
              description={
                space.parentSpaceId
                  ? `Inside ${spaces.find((s) => s.id === space.parentSpaceId)?.name ?? 'space'}`
                  : space.description
              }
            >
              <div className="flex gap-2">
                <Badge variant={space.archivedAt ? 'neutral' : 'accent'}>
                  {space.archivedAt ? 'Archived' : space.type}
                </Badge>
                <Badge>
                  {plants.filter((p) => p.spaceId === space.id).length} plants
                </Badge>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setSelected(space.id)}>
                  Details
                </Button>
                <Button variant="ghost" onClick={() => setEditing(space)}>
                  <Pencil size={15} />
                  Edit
                </Button>
                {space.archivedAt ? (
                  <Button
                    variant="secondary"
                    onClick={() => m.restoreSpace.mutate(space.id)}
                  >
                    <RotateCcw size={15} />
                    Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      window.confirm(
                        `Archive ${space.name}? Plants remain assigned.`,
                      ) && m.archiveSpace.mutate(space.id)
                    }
                  >
                    <Archive size={15} />
                    Archive
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Boxes}
          title="No matching spaces"
          description="Add a space or adjust the filters."
        />
      )}
      {detail && (
        <div
          className="fixed inset-0 z-[75] grid place-items-center bg-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Space details"
        >
          <button
            className="absolute inset-0"
            onClick={() => setSelected(undefined)}
            aria-label="Close details"
          />
          <Card
            className="relative w-full max-w-xl"
            title={detail.name}
            description={detail.description}
          >
            <div className="space-y-2 text-sm">
              <p>
                <b>Children:</b>{' '}
                {spaces
                  .filter((s) => s.parentSpaceId === detail.id)
                  .map((s) => s.name)
                  .join(', ') || 'None'}
              </p>
              <p>
                <b>Plants:</b>{' '}
                {plants
                  .filter((p) => p.spaceId === detail.id)
                  .map((p) => p.nickname)
                  .join(', ') || 'None'}
              </p>
              <p>
                <b>Light:</b> {detail.lightNotes || 'Not recorded'}
              </p>
              <p>
                <b>Temperature:</b> {detail.temperatureNotes || 'Not recorded'}
              </p>
              <p>
                <b>Humidity:</b> {detail.humidityNotes || 'Not recorded'}
              </p>
            </div>
          </Card>
        </div>
      )}
      {editing !== undefined && (
        <SpaceFormDialog
          key={editing?.id ?? 'new'}
          space={editing ?? undefined}
          spaces={spaces}
          error={error instanceof Error ? error.message : undefined}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}
    </Page>
  )
}

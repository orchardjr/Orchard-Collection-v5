import { Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Page } from '../../components/ui/Page'
import {
  FeederFormDialog,
  type FeederFormValues,
  type SimpleField,
} from '../../features/feeders/FeederFormDialog'
import { useFeederData, useFeederMutation } from '../../hooks/useFeederData'
import { feederService } from '../../services/FeederService'

const date = () => new Date().toISOString().slice(0, 10)
const field = 'h-11 rounded-xl border border-border bg-background px-3'
function useAddQuery() {
  const [params, setParams] = useSearchParams()
  const [open, setOpenState] = useState(params.get('add') === '1')
  const setOpen = (value: boolean) => {
    setOpenState(value)
    if (!value && params.has('add')) {
      const next = new URLSearchParams(params)
      next.delete('add')
      setParams(next, { replace: true })
    }
  }
  return [open, setOpen] as const
}
function FilterBar({
  search,
  setSearch,
  status,
  setStatus,
}: {
  search: string
  setSearch: (v: string) => void
  status: string
  setStatus: (v: string) => void
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <input
        aria-label="Search"
        placeholder="Search…"
        className={`${field} flex-1`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        aria-label="Status filter"
        className={field}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">All statuses</option>
        {[
          'active',
          'starting',
          'producing',
          'low-production',
          'paused',
          'quarantine',
          'retired',
          'failed',
          'incubating',
          'hatching',
          'pinheads',
          'available',
          'low-stock',
          'depleted',
        ].map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </div>
  )
}

export function FeederColoniesPage() {
  const query = useFeederData()
  const [open, setOpen] = useAddQuery()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const mutation = useFeederMutation(
    feederService.createColony.bind(feederService),
  )
  const data = query.data
  const rows = useMemo(
    () =>
      data?.colonies.filter(
        (c) =>
          (!search ||
            `${c.colonyId} ${c.name}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!status || c.status === status),
      ) ?? [],
    [data, search, status],
  )
  const fields: SimpleField[] = [
    { name: 'name', label: 'Colony name', required: true },
    {
      name: 'speciesId',
      label: 'Species',
      type: 'select',
      required: true,
      options: data?.species.map((s) => [s.id, s.name]),
    },
    {
      name: 'type',
      label: 'Colony type',
      type: 'select',
      required: true,
      options: [
        ['discoid-breeder', 'Discoid Roach Breeder'],
        ['discoid-grow-out', 'Discoid Roach Grow-Out'],
        ['cricket-breeder', 'Cricket Breeder'],
        ['mealworm', 'Mealworm'],
        ['superworm', 'Superworm'],
        ['fruit-fly', 'Fruit Fly Culture'],
        ['isopod', 'Isopod Culture'],
        ['other', 'Other'],
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      value: 'active',
      options: [
        'active',
        'starting',
        'producing',
        'low-production',
        'paused',
        'quarantine',
      ].map((v) => [v, v]),
    },
    {
      name: 'dateStarted',
      label: 'Date started',
      type: 'date',
      required: true,
      value: date(),
    },
    { name: 'binId', label: 'Bin / enclosure ID', required: true },
    { name: 'location', label: 'Location' },
    {
      name: 'estimatedPopulation',
      label: 'Estimated population',
      type: 'number',
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  return (
    <Page
      title="Colonies"
      subtitle="Breeder and culture health at a glance."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} />
          Add Colony
        </Button>
      }
    >
      <FilterBar {...{ search, setSearch, status, setStatus }} />
      {query.isLoading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" />
      ) : rows.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} hover>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-accent">{c.colonyId}</p>
                  <h2 className="mt-1 text-xl font-semibold">{c.name}</h2>
                </div>
                <Badge>{c.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {data?.species.find((s) => s.id === c.speciesId)?.name} ·{' '}
                {c.binId}
              </p>
              <p className="mt-2 text-sm">
                Estimated population: {c.estimatedPopulation ?? 'Not counted'}
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent"
                to={`/feeders/colonies/${c.id}`}
              >
                Open colony →
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No colonies found"
          description="Add your first breeder or feeder culture."
        />
      )}
      {open && (
        <FeederFormDialog
          title="Add colony"
          fields={fields}
          error={mutation.error?.message}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            await mutation.mutateAsync({
              name: v.name,
              speciesId: v.speciesId,
              type: v.type as never,
              status: v.status as never,
              dateStarted: new Date(v.dateStarted),
              binId: v.binId,
              location: v.location || undefined,
              estimatedPopulation: v.estimatedPopulation
                ? Number(v.estimatedPopulation)
                : undefined,
              notes: v.notes || undefined,
            })
            setOpen(false)
          }}
        />
      )}
    </Page>
  )
}

export function CricketBatchesPage() {
  const query = useFeederData()
  const [open, setOpen] = useAddQuery()
  const mutation = useFeederMutation(
    feederService.createBatch.bind(feederService),
  )
  const data = query.data
  const fields: SimpleField[] = [
    {
      name: 'parentColonyId',
      label: 'Parent breeder colony',
      type: 'select',
      options: data?.colonies.map((c) => [c.id, `${c.colonyId} · ${c.name}`]),
    },
    {
      name: 'stage',
      label: 'Stage',
      type: 'select',
      required: true,
      value: 'incubating',
      options: [
        'breeding',
        'eggs-collected',
        'incubating',
        'hatching',
        'pinheads',
        'small',
        'medium',
        'large',
        'adult',
      ].map((v) => [v, v]),
    },
    { name: 'eggsMovedAt', label: 'Eggs moved to incubation', type: 'date' },
    {
      name: 'incubationDays',
      label: 'Incubation days',
      type: 'number',
      value: 10,
    },
    { name: 'binId', label: 'Bin ID', required: true },
    { name: 'quantity', label: 'Current quantity', type: 'number', value: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  return (
    <Page
      title="Cricket Batches"
      subtitle="Egg, hatch, and grow-out lifecycle tracking."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} />
          Add Batch
        </Button>
      }
    >
      {query.isLoading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" />
      ) : data?.batches.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.batches.map((b) => (
            <Card key={b.id}>
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">{b.batchId}</h2>
                <Badge>{b.stage}</Badge>
              </div>
              <p className="mt-3">
                {b.quantity} · {b.size}
              </p>
              <p className="text-sm text-muted-foreground">Bin {b.binId}</p>
              {b.estimatedHatchAt && (
                <p className="mt-3 text-sm">
                  Estimated hatch {b.estimatedHatchAt.toLocaleDateString()}
                </p>
              )}
              <Link
                className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent"
                to={`/feeders/crickets/${b.id}`}
              >
                Open batch →
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No cricket batches"
          description="Create a batch to begin lifecycle tracking."
        />
      )}
      {open && (
        <FeederFormDialog
          title="Add cricket batch"
          fields={fields}
          error={mutation.error?.message}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            await mutation.mutateAsync({
              parentColonyId: v.parentColonyId || undefined,
              stage: v.stage as never,
              eggsMovedAt: v.eggsMovedAt ? new Date(v.eggsMovedAt) : undefined,
              incubationDays: Number(v.incubationDays),
              binId: v.binId,
              quantity: Number(v.quantity),
              size: 'egg',
              notes: v.notes || undefined,
            })
            setOpen(false)
          }}
        />
      )}
    </Page>
  )
}

export function FeederInventoryPage() {
  const query = useFeederData()
  const [open, setOpen] = useAddQuery()
  const [adjust, setAdjust] = useState<string>()
  const create = useFeederMutation(async (v: FeederFormValues) =>
    feederService.createInventory(
      {
        speciesId: v.speciesId,
        size: v.size as never,
        unit: v.unit as never,
        storageBin: v.storageBin,
        dateAdded: new Date(v.dateAdded),
        minimumStock: Number(v.minimumStock),
        status: 'available',
        notes: v.notes || undefined,
      },
      Number(v.quantity),
    ),
  )
  const change = useFeederMutation(async (v: { id: string; delta: number }) =>
    feederService.adjustInventory(
      v.id,
      v.delta > 0 ? 'add' : 'remove',
      v.delta,
    ),
  )
  const common: SimpleField[] = [
    {
      name: 'speciesId',
      label: 'Species',
      type: 'select',
      required: true,
      options: query.data?.species.map((s) => [s.id, s.name]),
    },
    {
      name: 'size',
      label: 'Life stage / size',
      type: 'select',
      required: true,
      options: [
        'egg',
        'pinhead',
        'extra-small',
        'small',
        'medium',
        'large',
        'adult',
        'mixed',
      ].map((v) => [v, v]),
    },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    {
      name: 'unit',
      label: 'Unit',
      type: 'select',
      required: true,
      value: 'count',
      options: ['count', 'grams', 'cups', 'culture'].map((v) => [v, v]),
    },
    { name: 'storageBin', label: 'Storage bin', required: true },
    {
      name: 'dateAdded',
      label: 'Date added',
      type: 'date',
      required: true,
      value: date(),
    },
    { name: 'minimumStock', label: 'Minimum stock', type: 'number', value: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  return (
    <Page
      title="Feeder Inventory"
      subtitle="Available feeders with permanent quantity history."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} />
          Add Inventory
        </Button>
      }
    >
      {query.data?.inventory.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.inventory.map((i) => (
            <Card key={i.id}>
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">{i.inventoryId}</h2>
                <Badge>{i.status}</Badge>
              </div>
              <p className="mt-3 text-3xl font-bold">
                {i.quantity}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {i.unit}
                </span>
              </p>
              <p>
                {query.data.species.find((s) => s.id === i.speciesId)?.name} ·{' '}
                {i.size}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setAdjust(i.id)}>
                  <SlidersHorizontal size={17} />
                  Adjust
                </Button>
                <Link
                  className="inline-flex min-h-11 items-center font-semibold text-accent"
                  to={`/feeders/inventory/${i.id}`}
                >
                  Open →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No feeder inventory"
          description="Add available feeders or record a harvest."
        />
      )}
      {open && (
        <FeederFormDialog
          title="Add inventory"
          fields={common}
          error={create.error?.message}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            await create.mutateAsync(v)
            setOpen(false)
          }}
        />
      )}
      {adjust && (
        <FeederFormDialog
          title="Adjust inventory"
          fields={[
            {
              name: 'delta',
              label: 'Change (+ add, − remove)',
              type: 'number',
              allowNegative: true,
              required: true,
            },
            { name: 'confirm', label: 'Reason', required: true },
          ]}
          error={change.error?.message}
          onClose={() => setAdjust(undefined)}
          onSave={async (v) => {
            const delta = Number(v.delta)
            if (
              Math.abs(delta) >= 100 &&
              !window.confirm('Apply this large inventory correction?')
            )
              return
            await change.mutateAsync({ id: adjust, delta })
            setAdjust(undefined)
          }}
        />
      )}
    </Page>
  )
}

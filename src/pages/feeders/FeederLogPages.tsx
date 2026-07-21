import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Page } from '../../components/ui/Page'
import {
  FeederFormDialog,
  type SimpleField,
} from '../../features/feeders/FeederFormDialog'
import { nextRecordCode } from '../../features/feeders/feederLogic'
import { useFeederData, useFeederMutation } from '../../hooks/useFeederData'
import { feederService } from '../../services/FeederService'

const now = () => new Date().toISOString().slice(0, 16)
function LogList({
  rows,
}: {
  rows: Array<{ id: string; title: string; subtitle: string; date: Date }>
}) {
  return rows.length ? (
    <div className="space-y-3">
      {rows
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((row) => (
          <Card key={row.id}>
            <div className="flex flex-col justify-between gap-1 sm:flex-row">
              <div>
                <h2 className="font-semibold capitalize">
                  {row.title.replaceAll('-', ' ')}
                </h2>
                <p className="text-sm text-muted-foreground">{row.subtitle}</p>
              </div>
              <time className="text-sm text-muted-foreground">
                {row.date.toLocaleString()}
              </time>
            </div>
          </Card>
        ))}
    </div>
  ) : (
    <EmptyState
      title="No records yet"
      description="Use the add button to record this operation."
    />
  )
}
function targets(data: ReturnType<typeof useFeederData>['data']) {
  return [
    ...(data?.colonies.map((c) => [
      `colony:${c.id}`,
      `${c.colonyId} · ${c.name}`,
    ]) ?? []),
    ...(data?.batches.map((b) => [`batch:${b.id}`, b.batchId]) ?? []),
  ] as Array<[string, string]>
}

export function MaintenanceLogPage() {
  const query = useFeederData()
  const [open, setOpen] = useState(
    new URLSearchParams(location.search).get('add') === '1',
  )
  const mutation = useFeederMutation(
    feederService.logMaintenance.bind(feederService),
  )
  const fields: SimpleField[] = [
    {
      name: 'target',
      label: 'Colony or batch',
      type: 'select',
      required: true,
      options: targets(query.data),
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        'feeding',
        'moisture-added',
        'water-crystals-replaced',
        'produce-added',
        'dry-food-added',
        'cleaning',
        'egg-crate-replaced',
        'substrate-added',
        'substrate-removed',
        'population-count',
        'temperature-check',
        'humidity-check',
        'colony-transfer',
        'mortality-check',
        'general-inspection',
        'other',
      ].map((v) => [v, v]),
    },
    {
      name: 'occurredAt',
      label: 'Date and time',
      type: 'datetime-local',
      required: true,
      value: now(),
    },
    { name: 'material', label: 'Food / material' },
    { name: 'amount', label: 'Amount' },
    { name: 'temperature', label: 'Temperature °C', type: 'number' },
    { name: 'humidity', label: 'Humidity %', type: 'number' },
    { name: 'mortality', label: 'Mortality noticed', type: 'number' },
    { name: 'observations', label: 'Observations', type: 'textarea' },
    { name: 'userName', label: 'Logged by', value: 'Local user' },
  ]
  return (
    <Page
      title="Maintenance Log"
      subtitle="Reusable care history for colonies and cricket batches."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} />
          Log Maintenance
        </Button>
      }
    >
      <LogList
        rows={(query.data?.maintenance ?? []).map((l) => ({
          id: l.id,
          title: l.action,
          subtitle: l.observations || l.material || 'Maintenance recorded',
          date: l.occurredAt,
        }))}
      />
      {open && (
        <FeederFormDialog
          title="Log maintenance"
          fields={fields}
          error={mutation.error?.message}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            const [type, id] = v.target.split(':')
            await mutation.mutateAsync({
              colonyId: type === 'colony' ? id : undefined,
              batchId: type === 'batch' ? id : undefined,
              action: v.action as never,
              occurredAt: new Date(v.occurredAt),
              material: v.material || undefined,
              amount: v.amount || undefined,
              temperature: v.temperature ? Number(v.temperature) : undefined,
              humidity: v.humidity ? Number(v.humidity) : undefined,
              mortality: v.mortality ? Number(v.mortality) : undefined,
              observations: v.observations || undefined,
              userName: v.userName || undefined,
            })
            setOpen(false)
          }}
        />
      )}
    </Page>
  )
}

export function HarvestLogPage() {
  const query = useFeederData()
  const [open, setOpen] = useState(
    new URLSearchParams(location.search).get('add') === '1',
  )
  const mutation = useFeederMutation(
    feederService.logHarvest.bind(feederService),
  )
  const data = query.data
  const fields: SimpleField[] = [
    {
      name: 'target',
      label: 'Source colony or batch',
      type: 'select',
      required: true,
      options: targets(data),
    },
    {
      name: 'speciesId',
      label: 'Species',
      type: 'select',
      required: true,
      options: data?.species.map((s) => [s.id, s.name]),
    },
    {
      name: 'occurredAt',
      label: 'Date and time',
      type: 'datetime-local',
      required: true,
      value: now(),
    },
    {
      name: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: [
        'pinhead',
        'extra-small',
        'small',
        'medium',
        'large',
        'adult',
        'mixed',
      ].map((v) => [v, v]),
    },
    {
      name: 'quantity',
      label: 'Quantity removed',
      type: 'number',
      required: true,
    },
    {
      name: 'unit',
      label: 'Unit',
      type: 'select',
      required: true,
      value: 'count',
      options: ['count', 'grams', 'cups', 'culture'].map((v) => [v, v]),
    },
    {
      name: 'destination',
      label: 'Destination',
      type: 'select',
      required: true,
      options: [
        ['fed-immediately', 'Fed Immediately'],
        ['inventory', 'Added to Feeder Inventory'],
        ['grow-out', 'Moved to Grow-Out'],
        ['sold', 'Sold'],
        ['given-away', 'Given Away'],
        ['disposed', 'Disposed'],
        ['other', 'Other'],
      ],
    },
    {
      name: 'inventoryId',
      label: 'Destination inventory',
      type: 'select',
      options: data?.inventory.map((i) => [i.id, i.inventoryId]),
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  return (
    <Page
      title="Harvest Log"
      subtitle="Track production destinations and inventory contributions."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} />
          Record Harvest
        </Button>
      }
    >
      <LogList
        rows={(data?.harvests ?? []).map((h) => ({
          id: h.id,
          title: `${h.quantity} ${h.unit} · ${h.destination}`,
          subtitle:
            data?.species.find((s) => s.id === h.speciesId)?.name ?? 'Feeder',
          date: h.occurredAt,
        }))}
      />
      {open && (
        <FeederFormDialog
          title="Record harvest"
          fields={fields}
          error={mutation.error?.message}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            const [type, id] = v.target.split(':')
            const code = nextRecordCode(
              'HAR',
              (data?.harvests ?? []).map((h) => h.harvestId),
            )
            await mutation.mutateAsync({
              harvestId: code,
              occurredAt: new Date(v.occurredAt),
              colonyId: type === 'colony' ? id : undefined,
              batchId: type === 'batch' ? id : undefined,
              speciesId: v.speciesId,
              size: v.size as never,
              quantity: Number(v.quantity),
              unit: v.unit as never,
              destination: v.destination as never,
              inventoryId: v.inventoryId || undefined,
              notes: v.notes || undefined,
            })
            setOpen(false)
          }}
        />
      )}
    </Page>
  )
}

export function FeedingLogPage() {
  const query = useFeederData()
  const [open, setOpen] = useState(
    new URLSearchParams(location.search).get('add') === '1',
  )
  const mutation = useFeederMutation(
    feederService.logFeeding.bind(feederService),
  )
  const data = query.data
  const fields: SimpleField[] = [
    {
      name: 'animalId',
      label: 'Animal',
      type: 'select',
      options: data?.animals.map((a) => [a.id, a.nickname]),
    },
    {
      name: 'inventoryId',
      label: 'Source inventory',
      type: 'select',
      options: data?.inventory
        .filter((i) => i.quantity > 0)
        .map((i) => [i.id, `${i.inventoryId} · ${i.quantity} ${i.unit}`]),
    },
    {
      name: 'speciesId',
      label: 'Feeder species',
      type: 'select',
      required: true,
      options: data?.species.map((s) => [s.id, s.name]),
    },
    {
      name: 'occurredAt',
      label: 'Date and time',
      type: 'datetime-local',
      required: true,
      value: now(),
    },
    {
      name: 'size',
      label: 'Feeder size',
      type: 'select',
      required: true,
      options: [
        'pinhead',
        'extra-small',
        'small',
        'medium',
        'large',
        'adult',
        'mixed',
      ].map((v) => [v, v]),
    },
    {
      name: 'quantityOffered',
      label: 'Quantity offered',
      type: 'number',
      required: true,
    },
    {
      name: 'quantityEaten',
      label: 'Quantity eaten',
      type: 'number',
      required: true,
    },
    {
      name: 'supplements',
      label: 'Supplements',
      type: 'select',
      options: [
        'Plain Calcium',
        'Calcium with D3',
        'Multivitamin',
        'Other',
      ].map((v) => [v, v]),
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  return (
    <Page
      title="Feeding Log"
      subtitle="Link feeder use to Orchard animals and inventory."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus size={18} />
          Log Feeding
        </Button>
      }
    >
      <LogList
        rows={(data?.feedings ?? []).map((f) => ({
          id: f.id,
          title: `${f.quantityEaten} eaten of ${f.quantityOffered} offered`,
          subtitle:
            data?.animals.find((a) => a.id === f.animalId)?.nickname ||
            f.animalName ||
            'Unassigned animal',
          date: f.occurredAt,
        }))}
      />
      {open && (
        <FeederFormDialog
          title="Log animal feeding"
          fields={fields}
          error={mutation.error?.message}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            await mutation.mutateAsync({
              occurredAt: new Date(v.occurredAt),
              animalId: v.animalId || undefined,
              speciesId: v.speciesId,
              size: v.size as never,
              quantityOffered: Number(v.quantityOffered),
              quantityEaten: Number(v.quantityEaten),
              inventoryId: v.inventoryId || undefined,
              supplements: v.supplements ? [v.supplements] : [],
              notes: v.notes || undefined,
            })
            setOpen(false)
          }}
        />
      )}
    </Page>
  )
}

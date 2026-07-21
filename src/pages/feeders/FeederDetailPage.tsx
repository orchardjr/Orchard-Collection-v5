import { Archive } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { feederColonyRepository } from '../../db/repositories'
import { FeederFormDialog } from '../../features/feeders/FeederFormDialog'
import { FeederQrCode } from '../../features/feeders/QrCode'
import { useFeederData, useFeederMutation } from '../../hooks/useFeederData'
import { feederService } from '../../services/FeederService'

export function FeederDetailPage() {
  const { id } = useParams()
  const path = useLocation().pathname
  const type = path.includes('/colonies/')
    ? 'colony'
    : path.includes('/crickets/')
      ? 'cricket'
      : 'inventory'
  const query = useFeederData()
  const [action, setAction] = useState<string>()
  const maintenance = useFeederMutation(
    feederService.logMaintenance.bind(feederService),
  )
  const retire = useFeederMutation((recordId: string) =>
    feederColonyRepository.update(recordId, {
      status: 'retired',
      archivedAt: new Date(),
    }),
  )
  const adjust = useFeederMutation((input: { id: string; delta: number }) =>
    feederService.adjustInventory(
      input.id,
      'count-correction',
      input.delta,
      'Quick count adjustment',
    ),
  )
  const record =
    type === 'colony'
      ? query.data?.colonies.find((v) => v.id === id || v.colonyId === id)
      : type === 'cricket'
        ? query.data?.batches.find((v) => v.id === id || v.batchId === id)
        : query.data?.inventory.find((v) => v.id === id || v.inventoryId === id)
  if (query.isLoading)
    return (
      <Page title="Loading…">
        <div className="h-80 animate-pulse rounded-3xl bg-surface-muted" />
      </Page>
    )
  if (!record)
    return (
      <Page title="Record not found">
        <Link to="/feeders">Return to Feeder Management</Link>
      </Page>
    )
  const code =
    'colonyId' in record
      ? record.colonyId
      : 'batchId' in record
        ? record.batchId
        : record.inventoryId
  const status = 'status' in record ? record.status : record.stage
  const speciesId =
    'speciesId' in record
      ? record.speciesId
      : query.data?.colonies.find((c) => c.id === record.parentColonyId)
          ?.speciesId
  const species =
    query.data?.species.find((s) => s.id === speciesId)?.name ?? 'House Cricket'
  const actions =
    type === 'inventory'
      ? ['Adjust Count']
      : [
          'Fed',
          'Added Moisture',
          'Cleaned',
          'Count Updated',
          'Harvested',
          'Add Note',
        ]
  return (
    <Page
      title={code}
      subtitle={`${species} · ${type}`}
      actions={
        <Button variant="secondary" onClick={() => window.print()}>
          Print DYMO label
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                {'name' in record ? record.name : code}
              </h2>
              <Badge>{status}</Badge>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {Object.entries(record)
                .filter(
                  ([key, value]) =>
                    ![
                      'id',
                      'createdAt',
                      'updatedAt',
                      'qrValue',
                      'notes',
                    ].includes(key) &&
                    ['string', 'number'].includes(typeof value),
                )
                .slice(0, 12)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </dt>
                    <dd className="mt-1 font-semibold">{String(value)}</dd>
                  </div>
                ))}
            </dl>
            {record.notes && (
              <p className="mt-5 border-t border-border pt-4">{record.notes}</p>
            )}
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Quick actions</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((label) => (
                <Button
                  key={label}
                  variant="secondary"
                  onClick={() => setAction(label)}
                >
                  {label}
                </Button>
              ))}
              {type === 'colony' && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (window.confirm('Retire this colony?'))
                      void retire.mutateAsync(record.id)
                  }}
                >
                  <Archive size={17} />
                  Retire Colony
                </Button>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Related history</h2>
            <div className="mt-3 space-y-2">
              {query.data?.maintenance
                .filter((l) =>
                  'colonyId' in record
                    ? l.colonyId === record.id
                    : l.batchId === record.id,
                )
                .map((l) => (
                  <p
                    key={l.id}
                    className="rounded-xl bg-surface-muted p-3 text-sm"
                  >
                    {l.action.replaceAll('-', ' ')} ·{' '}
                    {l.occurredAt.toLocaleString()}
                  </p>
                ))}
            </div>
          </Card>
        </div>
        <aside className="print-label flex flex-col items-center rounded-3xl border border-border bg-white p-5 text-black">
          <strong>Orchard Chameleons</strong>
          <span className="text-sm capitalize">{type}</span>
          <span className="mt-2 text-2xl font-bold">{code}</span>
          <span>{species}</span>
          <div className="mt-4">
            <FeederQrCode value={record.qrValue} />
          </div>
          <small className="mt-2 break-all">{record.qrValue}</small>
        </aside>
      </div>
      {action && (
        <FeederFormDialog
          title={action}
          fields={
            type === 'inventory'
              ? [
                  {
                    name: 'delta',
                    label: 'Count change (+ or −)',
                    type: 'number',
                    allowNegative: true,
                    required: true,
                  },
                  { name: 'notes', label: 'Notes', type: 'textarea' },
                ]
              : [{ name: 'notes', label: 'Notes', type: 'textarea' }]
          }
          error={maintenance.error?.message ?? adjust.error?.message}
          onClose={() => setAction(undefined)}
          onSave={async (v) => {
            if (type === 'inventory') {
              await adjust.mutateAsync({
                id: record.id,
                delta: Number(v.delta),
              })
              setAction(undefined)
              return
            }
            const map: Record<string, string> = {
              Fed: 'feeding',
              'Added Moisture': 'moisture-added',
              Cleaned: 'cleaning',
              'Count Updated': 'population-count',
              'Add Note': 'other',
              Harvested: 'other',
            }
            await maintenance.mutateAsync({
              colonyId: type === 'colony' ? record.id : undefined,
              batchId: type === 'cricket' ? record.id : undefined,
              action: map[action] as never,
              occurredAt: new Date(),
              notes: v.notes || undefined,
            })
            setAction(undefined)
          }}
        />
      )}
    </Page>
  )
}

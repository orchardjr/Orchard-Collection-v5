import {
  AlertTriangle,
  Boxes,
  Bug,
  ClipboardCheck,
  Droplets,
  Egg,
  Package,
  ScanLine,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Page } from '../../components/ui/Page'
import { StatCard } from '../../components/ui/StatCard'
import { useFeederData } from '../../hooks/useFeederData'
import {
  intervalFor,
  isLowStock,
  maintenanceDueDate,
} from '../../features/feeders/feederLogic'

export function FeederDashboardPage() {
  const query = useFeederData()
  if (query.isLoading)
    return (
      <Page title="Feeder Management">
        <div className="h-80 animate-pulse rounded-3xl bg-surface-muted" />
      </Page>
    )
  if (query.error) throw query.error
  const data = query.data!
  const now = new Date()
  const active = data.colonies.filter(
    (item) => !item.archivedAt && !['retired', 'failed'].includes(item.status),
  )
  const due = active
    .flatMap((colony) =>
      (['feeding', 'moisture-added', 'cleaning'] as const).map((action) => ({
        colony,
        action,
        date: maintenanceDueDate(
          data.maintenance.filter((log) => log.colonyId === colony.id),
          action,
          intervalFor(colony, action, data.settings),
          colony.dateStarted,
        ),
      })),
    )
    .filter((item) => item.date <= now)
  const low = data.inventory.filter(
    (item) => isLowStock(item.quantity, item.minimumStock) && !item.archivedAt,
  )
  const hatchAlerts = data.batches
    .filter(
      (batch) =>
        batch.estimatedHatchAt &&
        ['incubating', 'hatching'].includes(batch.stage),
    )
    .map((batch) => ({
      batch,
      hours:
        (batch.estimatedHatchAt!.getTime() - now.getTime()) / (60 * 60 * 1000),
    }))
    .filter(({ hours }) => hours <= 48)
  const quick = [
    ['Add Colony', '/feeders/colonies?add=1', Bug],
    ['Add Cricket Batch', '/feeders/crickets?add=1', Egg],
    ['Log Feeding', '/feeders/feedings?add=1', Package],
    ['Log Maintenance', '/feeders/maintenance?add=1', ClipboardCheck],
    ['Record Harvest', '/feeders/harvests?add=1', Sparkles],
    ['Adjust Inventory', '/feeders/inventory', Boxes],
    ['Scan QR Code', '/feeders/scan', ScanLine],
  ] as const
  return (
    <Page
      title="Feeder Dashboard"
      subtitle="Live colony care, production, and feeder availability."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active colonies" value={active.length} icon={Bug} />
        <StatCard
          label="Batches incubating"
          value={data.batches.filter((b) => b.stage === 'incubating').length}
          icon={Egg}
        />
        <StatCard
          label="Pinhead batches"
          value={data.batches.filter((b) => b.stage === 'pinheads').length}
          icon={Sparkles}
        />
        <StatCard
          label="Total inventory"
          value={data.inventory.reduce((sum, item) => sum + item.quantity, 0)}
          icon={Boxes}
        />
      </div>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Quick actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {quick.map(([label, to, Icon]) => (
            <Link
              key={label}
              to={to}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-3 text-center text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-accent"
            >
              <Icon aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </section>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="text-amber-500" />
            Care alerts
          </h2>
          {due.length || low.length || hatchAlerts.length ? (
            <div className="mt-4 space-y-2">
              {due.map(({ colony, action, date }) => (
                <div
                  key={`${colony.id}-${action}`}
                  className="rounded-xl bg-red-500/10 p-3"
                >
                  <strong>{colony.name}</strong>
                  <p className="text-sm text-muted-foreground">
                    {action.replace('-', ' ')} overdue since{' '}
                    {date.toLocaleDateString()}
                  </p>
                </div>
              ))}
              {low.map((item) => (
                <div key={item.id} className="rounded-xl bg-amber-500/10 p-3">
                  <strong>{item.inventoryId} low stock</strong>
                  <p className="text-sm">
                    {item.quantity} {item.unit} remaining
                  </p>
                </div>
              ))}
              {hatchAlerts.map(({ batch, hours }) => (
                <div
                  key={batch.id}
                  className={`rounded-xl p-3 ${hours < 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}`}
                >
                  <strong>
                    {batch.batchId}{' '}
                    {hours < 0 ? 'hatch overdue' : 'hatch expected soon'}
                  </strong>
                  <p className="text-sm text-muted-foreground">
                    Estimated {batch.estimatedHatchAt!.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Everything is on track"
              description="No overdue care or low-stock inventory."
            />
          )}
        </Card>
        <Card>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Droplets className="text-accent" />
            Recent operations
          </h2>
          <div className="mt-4 space-y-3">
            {[...data.maintenance]
              .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
              .slice(0, 5)
              .map((log) => (
                <p
                  key={log.id}
                  className="border-b border-border/60 pb-3 text-sm"
                >
                  <strong>{log.action.replaceAll('-', ' ')}</strong>
                  <span className="block text-muted-foreground">
                    {log.occurredAt.toLocaleString()}
                  </span>
                </p>
              ))}
            {data.maintenance.length === 0 && (
              <EmptyState
                title="No activity yet"
                description="Log maintenance to build an operating history."
              />
            )}
          </div>
        </Card>
      </div>
    </Page>
  )
}

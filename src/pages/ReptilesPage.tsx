import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Page } from '../components/ui/Page'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useReptiles } from '../features/reptiles/useReptiles'
import {
  reptilesRepo,
  eventsRepo,
  supplementsRepo,
  reptileMediaRepo,
  uploadReptilePhoto,
  deleteReptile,
  deleteReptilePhoto,
} from '../features/reptiles/reptileService'
import { RecordDialog } from '../features/reptiles/forms'
import {
  identificationFields,
  husbandryFields,
  type Field,
} from '../features/reptiles/formFields'
import { EventDialog } from '../features/reptiles/EventDialog'
import { RoutineDialog } from '../features/reptiles/RoutineDialog'
import { WeightPanel } from '../features/reptiles/WeightPanel'
import { SupplementCalendar } from '../features/reptiles/SupplementCalendar'
import { ReptileReport } from '../features/reptiles/ReptileReport'
import {
  ageLabel,
  feedingTotals,
  weightHistory,
} from '../features/reptiles/calculations'
import type {
  EventKind,
  Reptile,
  ReptileEvent,
  Routine,
} from '../features/reptiles/types'
import { taskService } from '../services/TaskService'

export function ReptilesPage() {
  const query = useReptiles()
  const { reptileId } = useParams()
  const navigate = useNavigate()
  const [scope, setScope] = useState('active')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('Overview')
  const [profile, setProfile] = useState<Reptile | null>()
  const [husbandry, setHusbandry] = useState(false)
  const [product, setProduct] = useState(false)
  const [entry, setEntry] = useState<{
    kind: EventKind
    event?: ReptileEvent
  }>()
  const [routine, setRoutine] = useState<Routine | null>()
  const [report, setReport] = useState(false)
  const [photoEvent, setPhotoEvent] = useState('')
  const [photoProgress, setPhotoProgress] = useState('')
  const perform = (operation: () => Promise<unknown>) =>
    query.action.mutateAsync(operation)
  const run = (operation: () => Promise<unknown>) => {
    void perform(operation).catch(() => undefined)
  }
  if (!query.configured)
    return (
      <Page title="Reptiles">
        <p>
          Reptile care requires a signed-in cloud account. Local-only animal
          records are not imported or changed automatically.
        </p>
      </Page>
    )
  if (query.isPending)
    return (
      <Page title="Reptiles">
        <p role="status">Loading reptile care records…</p>
      </Page>
    )
  if (query.error || !query.data)
    return (
      <Page title="Reptiles">
        <p role="alert">
          Reptile records could not be loaded. If this is the first deployment,
          apply the reptile migration in Supabase before using this section.
          Existing plant data is unchanged.
        </p>
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </Page>
    )
  const data = query.data
  const animal = data.reptiles.find((a) => a.id === reptileId)
  const events = data.events
    .filter((e) => e.reptileId === reptileId)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
  const routines = data.routines.filter((r) => r.reptileId === reptileId)
  const tasks = data.tasks.filter((t) =>
    routines.some((r) => r.id === t.reptileRoutineId),
  )
  const media = data.media.filter((m) => m.reptileId === reptileId)
  const open = data.tasks.filter(
    (t) =>
      t.status === 'open' &&
      data.routines.some(
        (r) =>
          r.id === t.reptileRoutineId &&
          data.reptiles.some(
            (a) => a.id === r.reptileId && a.status === 'active',
          ),
      ),
  )
  const visible = data.reptiles.filter(
    (a) =>
      (scope === 'all' || a.status === scope) &&
      `${a.name} ${a.species} ${a.identification.morph}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const error = query.action.error
  const profileFields = identificationFields
  const saveProfile = (values: Record<string, string>) => {
    const { name, species, sex, attention, ...identification } = values
    if (
      identification.birthDate &&
      identification.birthDate > new Date().toISOString().slice(0, 10)
    )
      throw new Error('Birth date cannot be in the future.')
    const input = {
      name: name!.trim(),
      species: species!.trim(),
      sex: (sex || 'unknown') as Reptile['sex'],
      attention: attention === 'yes',
      identification,
    }
    return perform(() =>
      profile
        ? reptilesRepo.update(profile.id, input)
        : reptilesRepo.create({
            ...input,
            status: 'active',
            husbandry: {},
            deleting: false,
          }),
    )
  }
  const eventRows =
    tab === 'Weight'
      ? events.filter((e) => e.kind === 'weight')
      : tab === 'Feeding'
        ? events.filter((e) => e.kind === 'feeding')
        : tab === 'Supplements'
          ? events.filter((e) => e.kind === 'supplement')
          : tab === 'Health'
            ? events.filter((e) => e.kind === 'health')
            : tab === 'Husbandry'
              ? events.filter((e) => e.kind === 'husbandry')
              : events
  return (
    <Page
      title={animal ? animal.name : 'Reptile Collection'}
      subtitle={
        animal
          ? `${animal.species} · ${animal.sex} · ${ageLabel(animal.identification)}`
          : 'Individual care, growth and husbandry records'
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {animal ? (
            <>
              <Link className="p-3 text-accent" to="/reptiles">
                All reptiles
              </Link>
              <Button
                variant="secondary"
                disabled={animal.deleting}
                onClick={() => setProfile(animal)}
              >
                Edit profile
              </Button>
              <Button
                variant="secondary"
                disabled={query.action.isPending || animal.deleting}
                onClick={() => {
                  if (
                    window.confirm(
                      animal.status === 'active'
                        ? 'Archive this reptile and disable its care schedules? Records remain recoverable.'
                        : 'Restore this reptile? Schedules remain disabled until you enable them.',
                    )
                  )
                    run(() =>
                      reptilesRepo.update(animal.id, {
                        status:
                          animal.status === 'active' ? 'archived' : 'active',
                      }),
                    )
                }}
              >
                {animal.status === 'active' ? 'Archive' : 'Restore'}
              </Button>
              <Button
                variant="danger"
                disabled={query.action.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      'Permanently delete this reptile, its photos, care records and assigned reptile tasks? Shared supplement products and all plants are preserved. This cannot be undone.',
                    )
                  )
                    run(async () => {
                      await deleteReptile(animal.id)
                      navigate('/reptiles')
                    })
                }}
              >
                Delete reptile
              </Button>
            </>
          ) : (
            <Button onClick={() => setProfile(null)}>Add reptile</Button>
          )}
          <Button variant="secondary" onClick={() => setReport(true)}>
            Care report / Export
          </Button>
        </div>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-4 break-words rounded-xl border border-red-400 p-3"
        >
          {error.message}
        </p>
      )}
      {reptileId && !animal ? (
        <p>Reptile not found.</p>
      ) : !animal ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                'Active reptiles',
                data.reptiles.filter((a) => a.status === 'active').length,
              ],
              [
                'Upcoming feeding tasks',
                open.filter(
                  (t) =>
                    t.dueAt &&
                    t.dueAt >= new Date() &&
                    data.routines.find((r) => r.id === t.reptileRoutineId)
                      ?.type === 'feed',
                ).length,
              ],
              [
                'Upcoming supplement tasks',
                open.filter(
                  (t) =>
                    t.dueAt &&
                    t.dueAt >= new Date() &&
                    data.routines.find((r) => r.id === t.reptileRoutineId)
                      ?.type === 'supplement',
                ).length,
              ],
              [
                'Overdue care tasks',
                open.filter((t) => t.dueAt && t.dueAt < new Date()).length,
              ],
              [
                'Animals requiring attention',
                data.reptiles.filter(
                  (a) => a.status === 'active' && a.attention,
                ).length,
              ],
            ].map(([label, count]) => (
              <Card key={label} title={String(label)}>
                <p className="text-2xl">{count}</p>
              </Card>
            ))}
          </div>
          <Card title="Recent weight measurements">
            <ul>
              {weightHistory(data.events)
                .slice(-5)
                .reverse()
                .map((r) => (
                  <li key={r.event.id}>
                    {
                      data.reptiles.find((a) => a.id === r.event.reptileId)
                        ?.name
                    }
                    : {r.grams} g · {r.event.occurredAt.toLocaleDateString()}
                  </li>
                ))}
            </ul>
          </Card>
          <div className="my-5 flex flex-wrap gap-3">
            <input
              aria-label="Search reptiles"
              placeholder="Search name or species"
              className="min-h-11 min-w-0 rounded-xl border border-border bg-background p-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Reptile status"
              className="min-h-11 rounded-xl border border-border bg-background p-3"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((a) => {
              const photo =
                data.media.find((m) => m.reptileId === a.id && m.isProfile) ??
                data.media.find((m) => m.reptileId === a.id)
              return (
                <Link key={a.id} to={`/reptiles/${a.id}`}>
                  <Card title={a.name} description={a.species}>
                    {photo?.url && (
                      <img
                        loading="lazy"
                        className="mb-3 aspect-video w-full rounded-xl object-cover"
                        src={photo.url}
                        alt={a.name}
                      />
                    )}
                    <p>
                      {a.sex} · {ageLabel(a.identification)}
                    </p>
                    {a.attention && <p>Requires attention</p>}
                  </Card>
                </Link>
              )
            })}
          </div>
          {!visible.length && <p className="my-5">No reptiles in this view.</p>}
          <div className="mt-6">
            <Card title="Supplement calendar">
              <SupplementCalendar
                data={data}
                busy={query.action.isPending}
                onComplete={(id) => run(() => taskService.complete(id))}
              />
            </Card>
          </div>
        </>
      ) : (
        <>
          {animal.deleting && (
            <p role="alert">
              Deletion is in progress. Retry Delete reptile to finish cleanup.
            </p>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            {(['weight', 'feeding', 'supplement', 'health'] as const).map(
              (kind) => (
                <Button
                  key={kind}
                  disabled={animal.deleting}
                  onClick={() => setEntry({ kind })}
                >
                  +{' '}
                  {kind === 'health'
                    ? 'Observation'
                    : kind[0]!.toUpperCase() + kind.slice(1)}
                </Button>
              ),
            )}
          </div>
          <div
            role="tablist"
            aria-label="Reptile profile sections"
            className="mb-5 flex gap-1 overflow-x-auto"
          >
            {[
              'Overview',
              'Weight',
              'Feeding',
              'Supplements',
              'Husbandry',
              'Health',
              'Tasks',
            ].map((name) => (
              <button
                role="tab"
                aria-selected={tab === name}
                className={`min-h-11 shrink-0 rounded-xl p-3 ${tab === name ? 'bg-accent-soft' : 'bg-surface'}`}
                key={name}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={tab} className="space-y-5">
            {tab === 'Overview' && (
              <>
                <Card title="Identification">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(animal.identification)
                      .filter(([, v]) => v)
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-muted-foreground">
                            {identificationFields.find((f) => f.key === key)
                              ?.label ?? key}
                          </dt>
                          <dd className="break-words">{value}</dd>
                        </div>
                      ))}
                  </dl>
                  <p className="mt-3">
                    {animal.attention
                      ? 'Requires attention'
                      : 'No attention flag recorded'}
                  </p>
                </Card>
                <Card title="Photos">
                  <label className="block text-sm">
                    Attach new photos to a health record (optional)
                    <select
                      className="my-2 min-h-11 w-full rounded-xl border border-border bg-background p-2"
                      value={photoEvent}
                      onChange={(e) => setPhotoEvent(e.target.value)}
                    >
                      <option value="">Profile gallery only</option>
                      {events
                        .filter((e) => e.kind === 'health')
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.occurredAt.toLocaleDateString()} —{' '}
                            {String(e.payload.category ?? 'Health')} —{' '}
                            {e.notes.slice(0, 40)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <input
                    aria-label="Upload reptile photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    disabled={query.action.isPending || animal.deleting}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? [])
                      e.target.value = ''
                      run(async () => {
                        for (const [i, file] of files.entries()) {
                          setPhotoProgress(
                            `Uploading ${i + 1} of ${files.length}`,
                          )
                          await uploadReptilePhoto(
                            animal.id,
                            file,
                            photoEvent || undefined,
                          )
                        }
                        setPhotoProgress('Photos saved.')
                      })
                    }}
                  />
                  {photoProgress && <p role="status">{photoProgress}</p>}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {media.map((m) => (
                      <div key={m.id}>
                        {m.url && (
                          <img
                            loading="lazy"
                            className="aspect-square w-full rounded-xl object-cover"
                            src={m.url}
                            alt={m.fileName}
                          />
                        )}
                        <p className="break-words text-xs">
                          {m.fileName}
                          {m.isProfile ? ' · Profile photo' : ''}
                        </p>
                        <Button
                          variant="ghost"
                          disabled={query.action.isPending}
                          onClick={() =>
                            run(async () => {
                              for (const prior of media.filter(
                                (photo) => photo.isProfile,
                              ))
                                await reptileMediaRepo.update(prior.id, {
                                  isProfile: false,
                                })
                              await reptileMediaRepo.update(m.id, {
                                isProfile: true,
                              })
                            })
                          }
                        >
                          Use as profile
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={query.action.isPending}
                          onClick={() => {
                            if (
                              window.confirm('Permanently delete this photo?')
                            )
                              run(() => deleteReptilePhoto(m))
                          }}
                        >
                          Delete photo
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
            {tab === 'Weight' && (
              <Card title="Weight history">
                <WeightPanel events={events} />
                <Button onClick={() => setRoutine(null)}>
                  Add weigh-in reminder
                </Button>
              </Card>
            )}
            {tab === 'Feeding' && (
              <Card title="Consumption totals">
                <p>
                  {feedingTotals(events).consumed} consumed /{' '}
                  {feedingTotals(events).offered} offered across recorded
                  feedings. Compare entries below; different feeder sizes are
                  not nutritionally equivalent.
                </p>
                <ul
                  className="mt-3 space-y-2"
                  aria-label="Recent consumption trend"
                >
                  {events
                    .filter((event) => event.kind === 'feeding')
                    .slice()
                    .sort(
                      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
                    )
                    .slice(0, 7)
                    .map((event) => {
                      const totals = feedingTotals([event])
                      const percent = totals.offered
                        ? Math.round((totals.consumed / totals.offered) * 100)
                        : undefined
                      return (
                        <li key={event.id} className="text-sm">
                          {event.occurredAt.toLocaleDateString()}:{' '}
                          {percent === undefined
                            ? 'No feeders offered'
                            : `${percent}% consumed (${totals.consumed}/${totals.offered})`}
                        </li>
                      )
                    })}
                </ul>
              </Card>
            )}
            {tab === 'Supplements' && (
              <>
                <Card title="Products & dusting schedules">
                  <p className="mb-3 text-sm">
                    Schedules are user-defined, not veterinary recommendations.
                    D3 content is recorded from the product; unknown is not
                    treated as D3-free.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setProduct(true)}>
                      Add supplement product
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setRoutine(null)}
                    >
                      Add dusting schedule
                    </Button>
                  </div>
                  <ul className="mt-3">
                    {data.supplements.map((s) => (
                      <li key={s.id}>
                        {s.name} · {s.brand} · {s.category} · D3: {s.d3}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card title="Supplement calendar">
                  <SupplementCalendar
                    data={data}
                    reptileId={animal.id}
                    busy={query.action.isPending}
                    onComplete={(id) => run(() => taskService.complete(id))}
                  />
                </Card>
              </>
            )}
            {tab === 'Husbandry' && (
              <Card title="Husbandry">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button onClick={() => setHusbandry(true)}>
                    Edit husbandry
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEntry({ kind: 'husbandry' })}
                  >
                    Log environment
                  </Button>
                  <Button variant="secondary" onClick={() => setRoutine(null)}>
                    Add maintenance reminder
                  </Button>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(animal.husbandry).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs">
                        {husbandryFields.find((f) => f.key === key)?.label ??
                          key}
                      </dt>
                      <dd className="break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
            {(tab === 'Tasks' || tab === 'Supplements') && (
              <Card title="Care tasks and schedules">
                <Button onClick={() => setRoutine(null)}>
                  Add task / schedule
                </Button>
                <p className="my-3 text-sm">
                  Reminders also appear in the main Tasks page. Disabling a
                  schedule preserves history. Archive/restore never restarts
                  schedules automatically.
                </p>
                {routines.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"
                  >
                    <span>
                      {r.title} · {r.frequency} ·{' '}
                      {r.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Button variant="secondary" onClick={() => setRoutine(r)}>
                      Edit schedule
                    </Button>
                  </div>
                ))}
                {tasks
                  .sort(
                    (a, b) =>
                      (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0),
                  )
                  .map((t) => (
                    <article
                      key={t.id}
                      className="my-3 rounded-xl border border-border p-3"
                    >
                      <p>
                        {t.title} · {t.status}{' '}
                        {t.status === 'open' && t.dueAt && t.dueAt < new Date()
                          ? '· Overdue'
                          : ''}
                      </p>
                      <p className="text-sm">
                        Due: {t.dueAt?.toLocaleString() ?? 'No date'}
                        {t.completedAt
                          ? ` · Completed: ${t.completedAt.toLocaleString()}`
                          : ''}
                      </p>
                      {t.status === 'open' && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            disabled={query.action.isPending}
                            onClick={() =>
                              run(() => taskService.complete(t.id))
                            }
                          >
                            Complete
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={query.action.isPending}
                            onClick={() => run(() => taskService.skip(t.id))}
                          >
                            Mark missed
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
              </Card>
            )}
            {tab !== 'Tasks' && (
              <Card title={tab === 'Overview' ? 'Timeline' : `${tab} records`}>
                {eventRows.map((e) => (
                  <article className="border-b border-border py-4" key={e.id}>
                    <h3 className="font-semibold capitalize">
                      {e.kind} · {e.occurredAt.toLocaleString()}
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {e.notes}
                    </p>
                    <dl className="mt-2 text-sm">
                      {Object.entries(e.payload)
                        .filter(
                          ([key]) => !['taskId', 'routineId'].includes(key),
                        )
                        .map(([key, value]) => (
                          <div key={key} className="break-words">
                            <dt className="inline font-medium">{key}: </dt>
                            <dd className="inline">
                              {Array.isArray(value)
                                ? value
                                    .map((item) =>
                                      typeof item === 'object'
                                        ? Object.entries(item)
                                            .map(([k, v]) => `${k}: ${v}`)
                                            .join(', ')
                                        : String(item),
                                    )
                                    .join(' / ')
                                : String(value ?? '')}
                            </dd>
                          </div>
                        ))}
                    </dl>
                    {media
                      .filter((m) => m.eventId === e.id)
                      .map((m) => (
                        <img
                          key={m.id}
                          src={m.url}
                          alt={m.fileName}
                          className="mt-2 max-h-40 rounded-xl"
                        />
                      ))}
                    {!['task', 'supplement'].includes(e.kind) && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setEntry({ kind: e.kind, event: e })}
                        >
                          Edit record
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={query.action.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Delete this record? Linked photos remain in the gallery. Feeding-related pending tasks must be reviewed separately.',
                              )
                            )
                              run(() => eventsRepo.delete(e.id))
                          }}
                        >
                          Delete record
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
                {!eventRows.length && <p>No records yet.</p>}
                {tab === 'Health' && (
                  <Button className="mt-4" onClick={() => setTab('Overview')}>
                    Attach photos in gallery
                  </Button>
                )}
              </Card>
            )}
          </div>
        </>
      )}
      {profile !== undefined && (
        <RecordDialog
          title={profile ? 'Edit reptile' : 'Add reptile'}
          fields={profileFields}
          initial={
            profile
              ? {
                  ...profile.identification,
                  name: profile.name,
                  species: profile.species,
                  sex: profile.sex,
                  attention: profile.attention ? 'yes' : 'no',
                }
              : { sex: 'unknown', attention: 'no' }
          }
          onClose={() => setProfile(undefined)}
          onSave={saveProfile}
        />
      )}
      {animal && husbandry && (
        <RecordDialog
          title="Husbandry setup"
          fields={husbandryFields}
          initial={{ unit: 'C', ...animal.husbandry }}
          onClose={() => setHusbandry(false)}
          onSave={(values) =>
            perform(() => reptilesRepo.update(animal.id, { husbandry: values }))
          }
        />
      )}
      {animal && entry && (
        <EventDialog
          animal={animal}
          {...entry}
          supplements={data.supplements}
          onClose={() => setEntry(undefined)}
          onSave={perform}
        />
      )}
      {animal && routine !== undefined && (
        <RoutineDialog
          animal={animal}
          routine={routine ?? undefined}
          supplements={data.supplements}
          animals={data.reptiles}
          onClose={() => setRoutine(undefined)}
          onSave={perform}
        />
      )}
      {product && (
        <RecordDialog
          title="Supplement product"
          fields={
            [
              { key: 'name', label: 'Product name', required: true },
              { key: 'brand', label: 'Brand' },
              {
                key: 'category',
                label: 'Category',
                required: true,
                options: [
                  'calcium-no-d3',
                  'calcium-d3',
                  'multivitamin',
                  'other',
                ],
              },
              {
                key: 'd3',
                label: 'Contains D3',
                required: true,
                options: ['unknown', 'yes', 'no'],
              },
              { key: 'notes', label: 'Notes', type: 'textarea' },
            ] as Field[]
          }
          initial={{ d3: 'unknown' }}
          onClose={() => setProduct(false)}
          onSave={(v) =>
            perform(() =>
              supplementsRepo.create({
                name: v.name!,
                brand: v.brand ?? '',
                category: v.category!,
                d3: v.d3 as 'yes' | 'no' | 'unknown',
                notes: v.notes ?? '',
              }),
            )
          }
        />
      )}
      {report && (
        <ReptileReport
          data={data}
          initialIds={animal ? [animal.id] : visible.map((a) => a.id)}
          onClose={() => setReport(false)}
        />
      )}
    </Page>
  )
}

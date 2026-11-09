import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import {
  silkwormCohorts,
  silkwormEvents,
} from '../../data/silkwormRepositories'
import type { CreateInput } from '../../db/repositories/BaseRepository'
import { silkwormEventKinds, silkwormStages } from '../../models/Silkworm'
import type {
  SilkwormCohort,
  SilkwormEvent,
  SilkwormEventKind,
  SilkwormStage,
} from '../../models/Silkworm'

type Field = {
  name: string
  label: string
  type?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
}
const cohortFields: Field[] = [
  { name: 'name', label: 'Cohort name', required: true },
  { name: 'source', label: 'Supplier or origin' },
  { name: 'lineage', label: 'Lineage or cross' },
  { name: 'location', label: 'Container or incubator' },
  { name: 'population', label: 'Current live count', type: 'number', min: 0 },
  { name: 'eggsSet', label: 'Eggs set', type: 'number', min: 0 },
  { name: 'hatched', label: 'Total hatched so far', type: 'number', min: 0 },
  { name: 'incubationStart', label: 'Incubation start', type: 'date' },
  { name: 'expectedHatch', label: 'Expected hatch', type: 'date' },
  { name: 'firstHatch', label: 'First hatch', type: 'date' },
  {
    name: 'targetTemp',
    label: 'Target temperature (°C)',
    type: 'number',
    step: 0.1,
  },
  {
    name: 'targetRh',
    label: 'Target relative humidity (%)',
    type: 'number',
    min: 0,
    max: 100,
    step: 0.1,
  },
]
const eventFields: Record<SilkwormEventKind, Field[]> = {
  Environment: [
    {
      name: 'temperature',
      label: 'Measured temperature (°C)',
      type: 'number',
      step: 0.1,
    },
    {
      name: 'humidity',
      label: 'Measured relative humidity (%)',
      type: 'number',
      min: 0,
      max: 100,
      step: 0.1,
    },
  ],
  Feeding: [
    {
      name: 'food',
      label: 'Feed (mulberry leaves, chow, etc.)',
      required: true,
    },
    { name: 'amount', label: 'Amount and unit' },
  ],
  'Moth pairing': [
    { name: 'female', label: 'Female ID or cohort', required: true },
    { name: 'male', label: 'Male ID or cohort', required: true },
    { name: 'outcome', label: 'Duration and outcome' },
  ],
  'Egg laying': [
    { name: 'clutch', label: 'Clutch ID or pairing reference' },
    { name: 'eggs', label: 'Eggs counted', type: 'number', min: 0 },
  ],
  Diapause: [
    {
      name: 'status',
      label: 'Status or action (suspected, started, ended, etc.)',
      required: true,
    },
    { name: 'storage', label: 'Storage conditions or treatment' },
  ],
  Milestone: [
    {
      name: 'observation',
      label: 'Stage change, hatch, loss, or other observation',
      required: true,
    },
    { name: 'count', label: 'Count observed', type: 'number', min: 0 },
  ],
}
const templates = [
  { name: 'PetSmart larvae / cocoons', source: 'PetSmart', stage: 'Larvae' },
  {
    name: 'Jianpuzhai × Standard eggs',
    lineage: 'Jianpuzhai × Standard',
    stage: 'Eggs',
  },
] as const
const inputClass =
  'w-full rounded-lg border border-border bg-background p-2 text-foreground'
const keys = ['silkworms'] as const
const value = (data: FormData, name: string) =>
  String(data.get(name) ?? '').trim()
const number = (data: FormData, name: string) =>
  value(data, name) === '' ? null : Number(value(data, name))

function Fields({
  fields,
  values,
}: {
  fields: Field[]
  values: Partial<Record<string, unknown>>
}) {
  return fields.map(({ name, label, ...attributes }) => (
    <label key={name} className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        className={inputClass}
        name={name}
        defaultValue={String(values[name] ?? '')}
        {...attributes}
      />
    </label>
  ))
}

function CohortForm({
  initial,
  cohorts,
  save,
  cancel,
  pending,
}: {
  initial: Partial<SilkwormCohort>
  cohorts: SilkwormCohort[]
  save: (input: CreateInput<SilkwormCohort>) => void
  cancel: () => void
  pending: boolean
}) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = value(data, 'name')
    const eggsSet = number(data, 'eggsSet')
    const hatched = number(data, 'hatched')
    if (!name || (eggsSet !== null && hatched !== null && hatched > eggsSet)) {
      setError(
        !name
          ? 'Enter a cohort name.'
          : 'Total hatched cannot exceed eggs set.',
      )
      return
    }
    setError('')
    save({
      name,
      eggsSet,
      hatched,
      stage: value(data, 'stage') as SilkwormStage,
      source: value(data, 'source'),
      lineage: value(data, 'lineage'),
      location: value(data, 'location'),
      parentCohortId: value(data, 'parentCohortId') || null,
      population: number(data, 'population'),
      incubationStart: value(data, 'incubationStart') || null,
      expectedHatch: value(data, 'expectedHatch') || null,
      firstHatch: value(data, 'firstHatch') || null,
      targetTemp: number(data, 'targetTemp'),
      targetRh: number(data, 'targetRh'),
      notes: value(data, 'notes'),
    })
  }
  return (
    <Card title={initial.id ? 'Edit cohort' : 'New cohort'}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset
          disabled={pending}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Fields fields={cohortFields} values={{ ...initial }} />
          <label className="block space-y-1 text-sm">
            <span>Life stage</span>
            <select
              name="stage"
              defaultValue={initial.stage ?? 'Eggs'}
              className={inputClass}
            >
              {silkwormStages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Parent cohort</span>
            <select
              name="parentCohortId"
              defaultValue={initial.parentCohortId ?? ''}
              className={inputClass}
            >
              <option value="">None recorded</option>
              {cohorts
                .filter(({ id }) => id !== initial.id)
                .map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span>Notes</span>
            <textarea
              name="notes"
              className={inputClass}
              defaultValue={initial.notes}
            />
          </label>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            Save cohort
          </Button>
          <Button variant="secondary" disabled={pending} onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

function EventForm({
  cohortId,
  initial,
  save,
  cancel,
  pending,
}: {
  cohortId: string
  initial?: SilkwormEvent
  save: (input: CreateInput<SilkwormEvent>) => void
  cancel: () => void
  pending: boolean
}) {
  const [kind, setKind] = useState<SilkwormEventKind>(
    initial?.kind ?? 'Environment',
  )
  const [date] = useState(() => initial?.occurredAt ?? new Date())
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const details = Object.fromEntries(
      eventFields[kind].map(({ name }) => [name, value(data, name)]),
    )
    if (
      !Object.values(details).some(Boolean) ||
      eventFields[kind].some(({ name, required }) => required && !details[name])
    ) {
      setError('Enter the required details for this event.')
      return
    }
    setError('')
    save({
      cohortId,
      kind,
      details,
      occurredAt: new Date(value(data, 'occurredAt')),
      notes: value(data, 'notes'),
    })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span>Event type</span>
          <select
            className={inputClass}
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as SilkwormEventKind)
            }
          >
            {silkwormEventKinds.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <Fields
          fields={[
            {
              name: 'occurredAt',
              label: 'Date and time',
              type: 'datetime-local',
              required: true,
            },
          ]}
          values={{ occurredAt: localDate }}
        />
        <Fields
          key={kind}
          fields={eventFields[kind]}
          values={initial?.kind === kind ? initial.details : {}}
        />
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span>Notes</span>
          <textarea
            className={inputClass}
            name="notes"
            defaultValue={initial?.notes}
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Save event
        </Button>
        <Button variant="secondary" disabled={pending} onClick={cancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function CohortCard({
  cohort,
  cohorts,
  events,
  edit,
  log,
  editEvent,
}: {
  cohort: SilkwormCohort
  cohorts: SilkwormCohort[]
  events: SilkwormEvent[]
  edit: () => void
  log: () => void
  editEvent: (event: SilkwormEvent) => void
}) {
  const rate =
    cohort.eggsSet && cohort.hatched != null
      ? new Intl.NumberFormat(undefined, {
          style: 'percent',
          maximumFractionDigits: 1,
        }).format(cohort.hatched / cohort.eggsSet)
      : 'Pending'
  const readings = events.filter(({ kind }) => kind === 'Environment')
  const summary = [
    ['Stage', cohort.stage],
    ['Origin', cohort.source],
    ['Lineage', cohort.lineage],
    [
      'Parent cohort',
      cohorts.find(({ id }) => id === cohort.parentCohortId)?.name,
    ],
    ['Container', cohort.location],
    ['Live count', cohort.population],
    ['Eggs set', cohort.eggsSet],
    ['Hatched', cohort.hatched],
    ['Hatch rate', rate],
    ['Incubation start', cohort.incubationStart],
    ['Expected hatch', cohort.expectedHatch],
    ['First hatch', cohort.firstHatch],
    [
      'Temperature target',
      cohort.targetTemp != null ? `${cohort.targetTemp} °C` : null,
    ],
    [
      'Humidity target',
      cohort.targetRh != null ? `${cohort.targetRh}% RH` : null,
    ],
  ]
  return (
    <Card
      title={cohort.name}
      action={
        <Button variant="secondary" onClick={edit}>
          Edit cohort
        </Button>
      }
    >
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {summary
          .filter(([, item]) => item != null && item !== '')
          .map(([label, item]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{item}</dd>
            </div>
          ))}
      </dl>
      {cohort.notes && (
        <p className="mt-4 whitespace-pre-wrap text-sm">{cohort.notes}</p>
      )}
      {readings[0] && (
        <p className="mt-4 text-sm">
          Latest reading {readings[0].occurredAt.toLocaleString()} ·{' '}
          {eventFields.Environment.filter(
            ({ name }) => readings[0]?.details[name],
          )
            .map(({ name, label }) => `${label} ${readings[0]?.details[name]}`)
            .join(' · ')}
        </p>
      )}
      <details className="my-4 rounded-lg border border-border p-3">
        <summary className="cursor-pointer font-medium">
          Cohort history ({events.length})
        </summary>
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {event.kind} · {event.occurredAt.toLocaleString()}
                </p>
                {eventFields[event.kind]
                  .filter(({ name }) => event.details[name])
                  .map(({ name, label }) => (
                    <p key={name}>
                      {label} · {event.details[name]}
                    </p>
                  ))}
                {event.notes && (
                  <p className="whitespace-pre-wrap">{event.notes}</p>
                )}
              </div>
              <Button variant="ghost" onClick={() => editEvent(event)}>
                Edit event
              </Button>
            </li>
          ))}
        </ul>
      </details>
      <Button onClick={log}>Log event</Button>
    </Card>
  )
}

export function SilkwormPage() {
  const client = useQueryClient()
  const [draft, setDraft] = useState<Partial<SilkwormCohort>>()
  const [eventDraft, setEventDraft] = useState<{
    cohortId: string
    event?: SilkwormEvent
  }>()
  const query = useQuery({
    queryKey: keys,
    queryFn: async () => {
      const [cohorts, events] = await Promise.all([
        silkwormCohorts.getAll(),
        silkwormEvents.getAll(),
      ])
      return {
        cohorts,
        events: events.sort(
          (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
        ),
      }
    },
  })
  const cohortMutation = useMutation({
    mutationFn: async (input: CreateInput<SilkwormCohort>) => {
      const saved = draft?.id
        ? await silkwormCohorts.update(draft.id, input)
        : await silkwormCohorts.create(input)
      if (!saved) throw new Error('This cohort is no longer available.')
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys })
      setDraft(undefined)
    },
  })
  const eventMutation = useMutation({
    mutationFn: async (input: CreateInput<SilkwormEvent>) => {
      const id = eventDraft?.event?.id
      const saved = id
        ? await silkwormEvents.update(id, input)
        : await silkwormEvents.create(input)
      if (!saved) throw new Error('This event is no longer available.')
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys })
      setEventDraft(undefined)
    },
  })
  const busy = cohortMutation.isPending || eventMutation.isPending
  function openCohort(initial?: Partial<SilkwormCohort>) {
    cohortMutation.reset()
    eventMutation.reset()
    setEventDraft(undefined)
    setDraft(initial ?? {})
  }
  function openEvent(cohortId: string, event?: SilkwormEvent) {
    cohortMutation.reset()
    eventMutation.reset()
    setDraft(undefined)
    setEventDraft({ cohortId, event })
  }
  const { cohorts, events } = query.data ?? { cohorts: [], events: [] }
  const error = query.error ?? cohortMutation.error ?? eventMutation.error
  return (
    <Page
      title="Silkworms"
      subtitle="Track Bombyx mori cohorts from eggs to breeding moths."
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-border p-3">
            {error.message}
          </p>
        )}
        {query.isPending && <p>Loading cohorts…</p>}
        {query.isError && (
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reload tracker
          </Button>
        )}
        {query.data && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => openCohort()}>
                New cohort
              </Button>
              {templates
                .filter(
                  (template) =>
                    !cohorts.some(({ name }) => name === template.name),
                )
                .map((template) => (
                  <Button
                    variant="secondary"
                    key={template.name}
                    disabled={busy}
                    onClick={() => openCohort(template)}
                  >
                    Add {template.name}
                  </Button>
                ))}
            </div>
            {draft && (
              <CohortForm
                key={draft.id ?? draft.name ?? 'new'}
                initial={draft}
                cohorts={cohorts}
                save={cohortMutation.mutate}
                cancel={() => {
                  cohortMutation.reset()
                  setDraft(undefined)
                }}
                pending={busy}
              />
            )}
            {cohorts.length === 0 && !draft && (
              <p>Choose a starter cohort or add your own to begin tracking.</p>
            )}
            {cohorts.map((cohort) => (
              <div className="space-y-3" key={cohort.id}>
                <fieldset disabled={busy}>
                  <CohortCard
                    cohort={cohort}
                    cohorts={cohorts}
                    events={events.filter(
                      ({ cohortId }) => cohortId === cohort.id,
                    )}
                    edit={() => openCohort(cohort)}
                    log={() => openEvent(cohort.id)}
                    editEvent={(event) => openEvent(cohort.id, event)}
                  />
                </fieldset>
                {eventDraft?.cohortId === cohort.id && (
                  <Card
                    title={
                      eventDraft.event
                        ? 'Edit event'
                        : `Log event for ${cohort.name}`
                    }
                  >
                    <EventForm
                      key={eventDraft.event?.id ?? 'new'}
                      initial={eventDraft.event}
                      cohortId={cohort.id}
                      save={eventMutation.mutate}
                      cancel={() => {
                        eventMutation.reset()
                        setEventDraft(undefined)
                      }}
                      pending={busy}
                    />
                  </Card>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Page>
  )
}

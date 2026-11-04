import { RecordDialog } from './forms'
import { localDateTime, type Field } from './formFields'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { requireSupabase } from '../../lib/supabase'
import { toSupabaseRow, repositoryError } from '../../data/SupabaseRepository'
import { routinesRepo } from './reptileService'
import {
  reptileTaskTypes,
  type Reptile,
  type Routine,
  type Supplement,
} from './types'
export function RoutineDialog({
  animal,
  routine,
  supplements,
  animals,
  onClose,
  onSave,
}: {
  animal: Reptile
  routine?: Routine
  supplements: Supplement[]
  animals: Reptile[]
  onClose: () => void
  onSave: (operation: () => Promise<unknown>) => Promise<unknown>
}) {
  const [selectedDays, setSelectedDays] = useState(routine?.weekdays ?? [])
  const [dates, setDates] = useState(routine?.customDates ?? [])
  const [assigned, setAssigned] = useState(new Set([animal.id]))
  const [search, setSearch] = useState('')
  const fields: Field[] = [
    { key: 'title', label: 'Task / routine name', required: true },
    {
      key: 'type',
      label: 'Task type',
      options: Object.keys(reptileTaskTypes),
      optionLabels: reptileTaskTypes,
      required: true,
    },
    {
      key: 'supplement',
      label: 'Supplement product (required for dusting)',
      options: supplements.map((s) => s.id),
      optionLabels: Object.fromEntries(
        supplements.map((s) => [s.id, `${s.name} · ${s.brand} · D3: ${s.d3}`]),
      ),
    },
    {
      key: 'frequency',
      label: 'Repeat',
      options: [
        'once',
        'feeding',
        'days',
        'weeks',
        'weekdays',
        'monthly',
        'custom',
      ],
      required: true,
      optionLabels: {
        once: 'Does not repeat',
        feeding: 'Every logged feeding',
        days: 'Every X days',
        weeks: 'Every X weeks',
        weekdays: 'Specific weekdays',
        monthly: 'Monthly',
        custom: 'Custom dates',
      },
    },
    {
      key: 'intervalCount',
      label: 'Every X days / weeks',
      type: 'number',
      min: 1,
      max: 3650,
    },
    {
      key: 'startsAt',
      label: 'First due date / time',
      type: 'datetime-local',
      required: true,
    },
    {
      key: 'enabled',
      label: 'Enabled',
      options: ['yes', 'no'],
      required: true,
    },
  ]
  const product = supplements.find((s) => s.id === routine?.supplementId)
  return (
    <RecordDialog
      title={routine ? 'Edit care schedule' : 'Add task / schedule'}
      fields={fields}
      initial={{
        title: routine?.title ?? '',
        type: routine?.type ?? 'custom',
        supplement: product?.id ?? '',
        frequency: routine?.frequency ?? 'once',
        intervalCount: String(routine?.intervalCount ?? 1),
        weekdays: routine?.weekdays.join(',') ?? '',
        customDates: routine?.customDates.join(',') ?? '',
        startsAt: localDateTime(
          routine ? new Date(routine.startsAt) : new Date(),
        ),
        enabled: routine?.enabled === false ? 'no' : 'yes',
      }}
      onClose={onClose}
      onSave={(values) => {
        const frequency = values.frequency as Routine['frequency']
        const intervalCount = Number(values.intervalCount || 1)
        const weekdays = selectedDays
        const customDates = dates
        if (
          !Number.isInteger(intervalCount) ||
          intervalCount < 1 ||
          intervalCount > 3650
        )
          throw new Error('Use a whole interval from 1 to 3650.')
        if (
          frequency === 'weekdays' &&
          (!weekdays.length ||
            weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
        )
          throw new Error('Choose valid weekdays 0 through 6.')
        if (
          frequency === 'custom' &&
          (!customDates.length ||
            customDates.some(
              (d) =>
                !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
                !Number.isFinite(Date.parse(d)),
            ))
        )
          throw new Error('Enter valid custom dates.')
        const supplementId = supplements.find(
          (s) => s.id === values.supplement,
        )?.id
        if (values.type === 'supplement' && !supplementId)
          throw new Error('Choose a supplement product first.')
        const input = {
          reptileId: animal.id,
          title: values.title!.trim(),
          type: values.type!,
          supplementId,
          frequency,
          intervalCount,
          weekdays,
          customDates,
          startsAt: new Date(values.startsAt!).toISOString(),
          timezone:
            routine?.timezone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          enabled: values.enabled === 'yes',
        }
        return onSave(async () => {
          if (routine) return routinesRepo.update(routine.id, input)
          if (!assigned.size) throw new Error('Select at least one reptile.')
          const { error } = await requireSupabase().rpc(
            'create_reptile_routines',
            { input: toSupabaseRow(input), reptile_ids: [...assigned] },
          )
          if (error) throw repositoryError('reptile schedule assignment', error)
        })
      }}
    >
      {!routine && (
        <fieldset>
          <legend>Assigned reptiles</legend>
          <input
            aria-label="Search assignment reptiles"
            className="my-2 min-h-11 w-full rounded-lg border border-border bg-background p-2"
            placeholder="Search reptiles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {animals
            .filter(
              (a) =>
                a.status === 'active' &&
                !a.deleting &&
                `${a.name} ${a.species}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((a) => (
              <label key={a.id} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={assigned.has(a.id)}
                  onChange={(e) =>
                    setAssigned((old) => {
                      const next = new Set(old)
                      if (e.target.checked) next.add(a.id)
                      else next.delete(a.id)
                      return next
                    })
                  }
                />
                {a.name} · {a.species}
              </label>
            ))}
          <p className="text-xs">
            Each animal receives an independently completable task and schedule
            so one animal’s care never completes another’s.
          </p>
        </fieldset>
      )}
      <fieldset className="flex flex-wrap gap-2">
        <legend>Days (for Specific weekdays)</legend>
        {[
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ].map((name, index) => (
          <label
            className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3"
            key={name}
          >
            <input
              type="checkbox"
              checked={selectedDays.includes(index)}
              onChange={(e) =>
                setSelectedDays(
                  e.target.checked
                    ? [...selectedDays, index]
                    : selectedDays.filter((v) => v !== index),
                )
              }
            />
            {name}
          </label>
        ))}
      </fieldset>
      <label className="block">
        Add custom recurrence date
        <input
          type="date"
          className="m-2 min-h-11 rounded-lg border border-border bg-background p-2"
          onChange={(e) => {
            if (e.target.value)
              setDates([...new Set([...dates, e.target.value])].sort())
            e.target.value = ''
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {dates.map((date) => (
          <Button
            variant="ghost"
            key={date}
            onClick={() => setDates(dates.filter((d) => d !== date))}
          >
            {date} ×
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        No frequency is recommended automatically. Follow species-specific
        veterinary, product and equipment guidance. “feeding” creates a pending
        dusting task when you log each feeding; it never marks a dose as given.
        Custom recurrence uses explicit dates. Editing sets the next open
        occurrence to the first due date above.
      </p>
    </RecordDialog>
  )
}

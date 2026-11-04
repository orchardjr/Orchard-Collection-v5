import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { RecordDialog, fieldClass } from './forms'
import {
  localDateTime,
  environmentFields,
  healthFields,
  reproductiveFields,
  type Field,
} from './formFields'
import { eventsRepo } from './reptileService'
import { validateEvent } from './calculations'
import {
  feederTypes,
  type EventKind,
  type FeederEntry,
  type Reptile,
  type ReptileEvent,
  type Supplement,
} from './types'
export function EventDialog({
  animal,
  kind,
  event,
  onClose,
  onSave,
  supplements = [],
}: {
  animal: Reptile
  kind: EventKind
  event?: ReptileEvent
  supplements?: Supplement[]
  onClose: () => void
  onSave: (operation: () => Promise<unknown>) => Promise<unknown>
}) {
  const [feeders, setFeeders] = useState<FeederEntry[]>(
    (event?.payload.feeders as FeederEntry[]) ?? [
      {
        type: 'Crickets',
        offered: 0,
        consumed: 0,
        size: '',
        gutLoaded: 'unknown',
        supplements: '',
      },
    ],
  )
  const fields: Field[] = [
    {
      key: 'occurredAt',
      label: 'Actual date / time',
      type: 'datetime-local',
      required: true,
    },
    ...(kind === 'weight'
      ? [
          {
            key: 'grams',
            label: 'Weight (grams)',
            type: 'number',
            required: true,
            min: 0.001,
          },
        ]
      : kind === 'husbandry'
        ? environmentFields
        : kind === 'health'
          ? [
              ...healthFields,
              ...(animal.sex === 'female' ? reproductiveFields : []),
            ]
          : kind === 'feeding'
            ? [
                {
                  key: 'appetite',
                  label: 'Appetite / response',
                  options: [
                    'Not recorded',
                    'Eager',
                    'Normal',
                    'Reduced',
                    'Refused',
                    'Other',
                  ],
                },
              ]
            : kind === 'supplement'
              ? [
                  {
                    key: 'supplementId',
                    label: 'Supplement given',
                    required: true,
                    options: supplements.map((product) => product.id),
                    optionLabels: Object.fromEntries(
                      supplements.map((product) => [
                        product.id,
                        `${product.name} — ${product.brand || 'No brand'} (D3: ${product.d3})`,
                      ]),
                    ),
                  },
                ]
              : []),
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ]
  const initial: Record<string, string> = {
    occurredAt: localDateTime(event?.occurredAt),
    notes: event?.notes ?? '',
    unit: 'C',
    ...Object.fromEntries(
      Object.entries(event?.payload ?? {})
        .filter(([, v]) => typeof v !== 'object')
        .map(([k, v]) => [k, String(v)]),
    ),
  }
  return (
    <RecordDialog
      title={`${event ? 'Edit' : 'Log'} ${kind}`}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSave={(values) => {
        const { occurredAt, notes, ...rest } = values
        const payload: Record<string, unknown> = { ...rest }
        if (kind === 'weight') payload.grams = Number(rest.grams)
        if (kind === 'feeding') payload.feeders = feeders
        if (kind === 'supplement') {
          const product = supplements.find(
            (item) => item.id === rest.supplementId,
          )
          if (!product) throw new Error('Choose the supplement actually given.')
          Object.assign(payload, {
            productName: product.name,
            brand: product.brand,
            d3: product.d3,
            manual: true,
          })
        }
        const date = new Date(occurredAt!)
        validateEvent(kind, payload, date)
        return onSave(() =>
          event
            ? eventsRepo.update(event.id, {
                occurredAt: date,
                notes: notes ?? '',
                payload,
              })
            : eventsRepo.create({
                reptileId: animal.id,
                kind,
                occurredAt: date,
                notes: notes ?? '',
                payload,
              }),
        )
      }}
    >
      {kind === 'supplement' && (
        <p className="text-sm text-muted-foreground">
          For an unscheduled administration only. If a task is due, use Mark as
          given in Supplements instead to complete it and schedule its next
          occurrence.
        </p>
      )}
      {kind === 'feeding' && (
        <div className="space-y-4">
          {feeders.map((f, index) => (
            <fieldset
              key={index}
              className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"
            >
              <legend>Feeder {index + 1}</legend>
              {(
                [
                  'type',
                  'offered',
                  'consumed',
                  'size',
                  'gutLoaded',
                  'supplements',
                ] as const
              ).map((key) => (
                <label key={key} className="text-sm">
                  {
                    {
                      type: 'Feeder type (custom allowed)',
                      offered: 'Quantity offered',
                      consumed: 'Quantity consumed',
                      size: 'Feeder size',
                      gutLoaded: 'Gut-loaded',
                      supplements:
                        'Supplements noted (not an administration log)',
                    }[key]
                  }
                  {key === 'gutLoaded' ? (
                    <select
                      className={fieldClass}
                      value={f[key]}
                      onChange={(e) =>
                        setFeeders(
                          feeders.map((item, i) =>
                            i === index
                              ? { ...item, [key]: e.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <input
                      className={fieldClass}
                      list={key === 'type' ? 'reptile-feeder-types' : undefined}
                      type={
                        key === 'offered' || key === 'consumed'
                          ? 'number'
                          : 'text'
                      }
                      min={0}
                      step={1}
                      value={f[key]}
                      onChange={(e) =>
                        setFeeders(
                          feeders.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  [key]:
                                    key === 'offered' || key === 'consumed'
                                      ? Number(e.target.value)
                                      : e.target.value,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  )}
                </label>
              ))}
              <Button
                variant="ghost"
                onClick={() =>
                  setFeeders(feeders.filter((_, i) => i !== index))
                }
              >
                Remove feeder
              </Button>
            </fieldset>
          ))}
          <datalist id="reptile-feeder-types">
            {feederTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </datalist>
          <Button
            variant="secondary"
            onClick={() =>
              setFeeders([
                ...feeders,
                {
                  type: '',
                  offered: 0,
                  consumed: 0,
                  size: '',
                  gutLoaded: 'unknown',
                  supplements: '',
                },
              ])
            }
          >
            Add another feeder type
          </Button>
          <p className="text-sm">
            Logging feeding never marks a supplement as given. Every-feeding
            routines create separate pending tasks.
          </p>
        </div>
      )}
    </RecordDialog>
  )
}

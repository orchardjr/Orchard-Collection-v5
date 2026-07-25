import { Copy, Plus, Save, Star, Trash2 } from 'lucide-react'

import { Button } from '../../components/ui/Button'
import type { LabelFieldId, LabelTemplateDefinition } from '../../models'

const fieldOptions: { id: LabelFieldId; label: string }[] = [
  { id: 'plantName', label: 'Plant name' },
  { id: 'scientificName', label: 'Scientific name' },
  { id: 'cultivar', label: 'Cultivar' },
  { id: 'clone', label: 'Clone' },
  { id: 'accessionId', label: 'Accession ID' },
  { id: 'collectionId', label: 'Collection ID' },
  { id: 'publicNfcUrl', label: 'Public NFC URL' },
  { id: 'qrCode', label: 'QR code' },
  { id: 'barcode', label: 'Barcode (Code 128)' },
  { id: 'acquisitionDate', label: 'Acquisition date' },
  { id: 'location', label: 'Location' },
  { id: 'notes', label: 'Notes' },
  { id: 'customFields', label: 'Custom fields' },
]

interface Props {
  template: LabelTemplateDefinition
  isDefault: boolean
  busy: boolean
  onChange: (template: LabelTemplateDefinition) => void
  onSave: () => void
  onDuplicate: () => void
  onDelete: () => void
  onDefault: () => void
}

export function TemplateEditor(props: Props) {
  const { template, onChange } = props
  const patch = (value: Partial<LabelTemplateDefinition>) =>
    onChange({ ...template, ...value })

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-3 text-sm font-semibold">
          Template name
          <input
            value={template.name}
            onChange={(e) => patch({ name: e.target.value })}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          Width (in)
          <input
            type="number"
            min="0.5"
            step="0.125"
            value={template.widthIn}
            onChange={(e) => patch({ widthIn: Number(e.target.value) })}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          Height (in)
          <input
            type="number"
            min="0.5"
            step="0.125"
            value={template.heightIn}
            onChange={(e) => patch({ heightIn: Number(e.target.value) })}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          Text scale
          <input
            type="number"
            min="0.5"
            max="2"
            step="0.05"
            value={template.fontScale}
            onChange={(e) => patch({ fontScale: Number(e.target.value) })}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 font-normal"
          />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Label fields</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {fieldOptions.map((field) => (
            <label
              key={field.id}
              className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-surface-muted"
            >
              <input
                type="checkbox"
                checked={template.fields.includes(field.id)}
                onChange={() =>
                  patch({
                    fields: template.fields.includes(field.id)
                      ? template.fields.filter((id) => id !== field.id)
                      : [...template.fields, field.id],
                  })
                }
              />
              <span className="text-sm">{field.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {template.fields.includes('customFields') && (
        <div className="space-y-2">
          {template.customFields.map((field) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                aria-label="Custom field label"
                value={field.label}
                placeholder="Label"
                onChange={(e) =>
                  patch({
                    customFields: template.customFields.map((item) =>
                      item.id === field.id
                        ? { ...item, label: e.target.value }
                        : item,
                    ),
                  })
                }
                className="min-h-11 rounded-xl border border-border bg-surface px-3"
              />
              <input
                aria-label="Custom field value"
                value={field.value}
                placeholder="Value"
                onChange={(e) =>
                  patch({
                    customFields: template.customFields.map((item) =>
                      item.id === field.id
                        ? { ...item, value: e.target.value }
                        : item,
                    ),
                  })
                }
                className="min-h-11 rounded-xl border border-border bg-surface px-3"
              />
              <Button
                aria-label="Remove custom field"
                variant="ghost"
                onClick={() =>
                  patch({
                    customFields: template.customFields.filter(
                      (item) => item.id !== field.id,
                    ),
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              patch({
                customFields: [
                  ...template.customFields,
                  { id: crypto.randomUUID(), label: '', value: '' },
                ],
              })
            }
          >
            <Plus className="size-4" /> Add custom field
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={props.busy} onClick={props.onSave}>
          <Save className="size-4" />
          {template.builtIn ? 'Save as custom' : 'Save changes'}
        </Button>
        <Button
          variant="secondary"
          disabled={props.busy}
          onClick={props.onDuplicate}
        >
          <Copy className="size-4" /> Duplicate
        </Button>
        <Button
          variant="ghost"
          disabled={props.busy || props.isDefault}
          onClick={props.onDefault}
        >
          <Star className="size-4" />
          {props.isDefault ? 'Default' : 'Set default'}
        </Button>
        {!template.builtIn && (
          <Button
            variant="danger"
            disabled={props.busy}
            onClick={props.onDelete}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        )}
      </div>
    </div>
  )
}

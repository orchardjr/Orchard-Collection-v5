import { labelTemplateRepository } from '../db/repositories'
import type {
  LabelFieldId,
  LabelTemplate,
  LabelTemplateDefinition,
} from '../models'

const DEFAULT_KEY = 'orchard-label-default-template'

const baseFields: LabelFieldId[] = [
  'plantName',
  'scientificName',
  'cultivar',
  'qrCode',
]

export const builtInLabelTemplates: LabelTemplateDefinition[] = [
  {
    id: 'builtin-dymo-address',
    name: 'Small DYMO address label',
    widthIn: 3.5,
    heightIn: 1.125,
    fields: baseFields,
    customFields: [],
    fontScale: 0.85,
    qrSizeIn: 0.82,
    barcodeHeightIn: 0.28,
    builtIn: true,
  },
  {
    id: 'builtin-2-25x1-25',
    name: '2¼″ × 1¼″',
    widthIn: 2.25,
    heightIn: 1.25,
    fields: ['plantName', 'scientificName', 'qrCode'],
    customFields: [],
    fontScale: 0.8,
    qrSizeIn: 0.78,
    barcodeHeightIn: 0.25,
    builtIn: true,
  },
  {
    id: 'builtin-2x4',
    name: '2″ × 4″',
    widthIn: 4,
    heightIn: 2,
    fields: [
      'plantName',
      'scientificName',
      'cultivar',
      'acquisitionDate',
      'location',
      'qrCode',
      'barcode',
    ],
    customFields: [],
    fontScale: 1,
    qrSizeIn: 0.95,
    barcodeHeightIn: 0.35,
    builtIn: true,
  },
  {
    id: 'builtin-qr-only',
    name: 'QR-only',
    widthIn: 2,
    heightIn: 2,
    fields: ['qrCode', 'publicNfcUrl'],
    customFields: [],
    fontScale: 0.72,
    qrSizeIn: 1.45,
    barcodeHeightIn: 0,
    builtIn: true,
  },
  {
    id: 'builtin-nfc-qr',
    name: 'NFC + QR',
    widthIn: 3.5,
    heightIn: 1.125,
    fields: ['plantName', 'publicNfcUrl', 'qrCode'],
    customFields: [],
    fontScale: 0.78,
    qrSizeIn: 0.82,
    barcodeHeightIn: 0,
    builtIn: true,
  },
  {
    id: 'builtin-collection',
    name: 'Collection label',
    widthIn: 4,
    heightIn: 2,
    fields: [
      'plantName',
      'scientificName',
      'cultivar',
      'accessionId',
      'collectionId',
      'acquisitionDate',
      'location',
      'qrCode',
    ],
    customFields: [],
    fontScale: 1,
    qrSizeIn: 0.95,
    barcodeHeightIn: 0.32,
    builtIn: true,
  },
  {
    id: 'builtin-propagation',
    name: 'Propagation label',
    widthIn: 3,
    heightIn: 1,
    fields: ['plantName', 'cultivar', 'clone', 'acquisitionDate', 'qrCode'],
    customFields: [],
    fontScale: 0.76,
    qrSizeIn: 0.7,
    barcodeHeightIn: 0.25,
    builtIn: true,
  },
  {
    id: 'builtin-seedling',
    name: 'Seedling label',
    widthIn: 2.25,
    heightIn: 1.25,
    fields: ['plantName', 'scientificName', 'acquisitionDate', 'qrCode'],
    customFields: [],
    fontScale: 0.76,
    qrSizeIn: 0.75,
    barcodeHeightIn: 0.25,
    builtIn: true,
  },
]

export type EditableTemplate = Omit<
  LabelTemplate,
  'id' | 'createdAt' | 'updatedAt'
>

const labelFieldIds = new Set<LabelFieldId>([
  'plantName',
  'scientificName',
  'cultivar',
  'clone',
  'accessionId',
  'collectionId',
  'publicNfcUrl',
  'qrCode',
  'barcode',
  'acquisitionDate',
  'location',
  'notes',
  'customFields',
])

export function normalizeLabelFields(fields: unknown): LabelFieldId[] {
  if (!Array.isArray(fields)) return []
  return Array.from(
    new Set(
      fields.flatMap((field) => {
        if (field === 'qr') return ['qrCode' as const]
        if (field === 'nfcUrl') return ['publicNfcUrl' as const]
        return typeof field === 'string' &&
          labelFieldIds.has(field as LabelFieldId)
          ? [field as LabelFieldId]
          : []
      }),
    ),
  )
}

export function validateLabelTemplate(template: EditableTemplate) {
  const errors: string[] = []
  if (!template.name.trim()) errors.push('Template name is required.')
  if (
    !Number.isFinite(template.widthIn) ||
    template.widthIn < 0.5 ||
    template.widthIn > 24
  )
    errors.push('Width must be between 0.5 and 24 inches.')
  if (
    !Number.isFinite(template.heightIn) ||
    template.heightIn < 0.5 ||
    template.heightIn > 24
  )
    errors.push('Height must be between 0.5 and 24 inches.')
  if (!template.fields.length) errors.push('Select at least one label field.')
  if (
    !Number.isFinite(template.fontScale) ||
    template.fontScale < 0.5 ||
    template.fontScale > 2
  )
    errors.push('Text scale must be between 0.5 and 2.')
  if (
    template.fields.includes('qrCode') &&
    (!Number.isFinite(template.qrSizeIn) ||
      template.qrSizeIn < 0.7 ||
      template.qrSizeIn > Math.min(template.widthIn, template.heightIn))
  )
    errors.push('QR size must fit the label and be at least 0.7 inches.')
  if (
    !Number.isFinite(template.barcodeHeightIn) ||
    template.barcodeHeightIn < 0 ||
    template.barcodeHeightIn > template.heightIn / 2
  )
    errors.push('Barcode height must fit within half the label height.')
  if (
    template.customFields.some(
      ({ label, value }) => label.length > 80 || value.length > 240,
    )
  )
    errors.push('Custom labels are limited to 80 and values to 240 characters.')
  return errors
}

export class TemplateService {
  async list(): Promise<LabelTemplateDefinition[]> {
    const custom = await this.listCustom()
    return [
      ...builtInLabelTemplates,
      ...custom.map((template) => ({ ...template, builtIn: false })),
    ]
  }

  async listCustom() {
    return (await labelTemplateRepository.getAll()).map((template) => ({
      ...template,
      fields: normalizeLabelFields(template.fields),
    }))
  }

  async save(template: EditableTemplate) {
    const normalized = { ...template, name: template.name.trim() }
    this.assertValid(normalized)
    await this.assertNameAvailable(normalized.name)
    return labelTemplateRepository.create(normalized)
  }

  async duplicate(template: LabelTemplateDefinition) {
    return this.saveDefinition(
      template,
      await this.uniqueName(`${template.name} copy`),
    )
  }

  async saveAsCustom(template: LabelTemplateDefinition) {
    return this.saveDefinition(
      template,
      await this.uniqueName(`${template.name} custom`),
    )
  }

  private saveDefinition(template: LabelTemplateDefinition, name: string) {
    return this.save({
      name,
      widthIn: template.widthIn,
      heightIn: template.heightIn,
      fields: [...template.fields],
      customFields: template.customFields.map((field) => ({ ...field })),
      fontScale: template.fontScale,
      qrSizeIn: template.qrSizeIn,
      barcodeHeightIn: template.barcodeHeightIn,
    })
  }

  async rename(id: string, name: string) {
    const normalized = name.trim()
    if (!normalized) throw new Error('Template name is required.')
    await this.assertNameAvailable(normalized, id)
    return labelTemplateRepository.update(id, { name: normalized })
  }

  async update(id: string, template: EditableTemplate) {
    const normalized = { ...template, name: template.name.trim() }
    this.assertValid(normalized)
    await this.assertNameAvailable(normalized.name, id)
    return labelTemplateRepository.update(id, normalized)
  }

  async delete(id: string) {
    await labelTemplateRepository.delete(id)
    if (this.getDefaultId() === id) localStorage.removeItem(DEFAULT_KEY)
  }

  setDefault(id: string) {
    localStorage.setItem(DEFAULT_KEY, id)
  }

  getDefaultId() {
    return localStorage.getItem(DEFAULT_KEY) ?? builtInLabelTemplates[0]!.id
  }

  private async uniqueName(base: string) {
    const names = new Set(
      (await this.list()).map((item) => item.name.trim().toLocaleLowerCase()),
    )
    if (!names.has(base.toLocaleLowerCase())) return base
    let index = 2
    while (names.has(`${base} ${index}`.toLocaleLowerCase())) index += 1
    return `${base} ${index}`
  }

  private assertValid(template: EditableTemplate) {
    const errors = validateLabelTemplate(template)
    if (errors[0]) throw new Error(errors[0])
  }

  private async assertNameAvailable(name: string, excludedId?: string) {
    const normalized = name.trim().toLocaleLowerCase()
    const duplicate = (await this.list()).some(
      (template) =>
        template.id !== excludedId &&
        template.name.trim().toLocaleLowerCase() === normalized,
    )
    if (duplicate) throw new Error('A template with this name already exists.')
  }
}

export const templateService = new TemplateService()

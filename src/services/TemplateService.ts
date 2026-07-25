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

export class TemplateService {
  async list(): Promise<LabelTemplateDefinition[]> {
    const custom = await labelTemplateRepository.getAll()
    return [
      ...builtInLabelTemplates,
      ...custom.map((template) => ({ ...template, builtIn: false })),
    ]
  }

  async save(template: EditableTemplate) {
    return labelTemplateRepository.create(template)
  }

  async duplicate(template: LabelTemplateDefinition) {
    return this.save({
      name: await this.uniqueName(`${template.name} copy`),
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
    return labelTemplateRepository.update(id, { name: name.trim() })
  }

  async update(id: string, template: EditableTemplate) {
    return labelTemplateRepository.update(id, template)
  }

  delete(id: string) {
    if (this.getDefaultId() === id) localStorage.removeItem(DEFAULT_KEY)
    return labelTemplateRepository.delete(id)
  }

  setDefault(id: string) {
    localStorage.setItem(DEFAULT_KEY, id)
  }

  getDefaultId() {
    return localStorage.getItem(DEFAULT_KEY) ?? builtInLabelTemplates[0]!.id
  }

  private async uniqueName(base: string) {
    const names = new Set((await this.list()).map((item) => item.name))
    if (!names.has(base)) return base
    let index = 2
    while (names.has(`${base} ${index}`)) index += 1
    return `${base} ${index}`
  }
}

export const templateService = new TemplateService()

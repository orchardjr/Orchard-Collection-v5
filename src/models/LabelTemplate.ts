import type { BaseRecord } from './BaseRecord'

export type LabelFieldId =
  | 'plantName'
  | 'scientificName'
  | 'cultivar'
  | 'clone'
  | 'accessionId'
  | 'collectionId'
  | 'publicNfcUrl'
  | 'qrCode'
  | 'barcode'
  | 'acquisitionDate'
  | 'location'
  | 'notes'
  | 'customFields'

export interface LabelCustomField {
  id: string
  label: string
  value: string
}

export interface LabelTemplate extends BaseRecord {
  name: string
  widthIn: number
  heightIn: number
  fields: LabelFieldId[]
  customFields: LabelCustomField[]
  fontScale: number
  qrSizeIn: number
  barcodeHeightIn: number
}

export interface LabelTemplateDefinition extends Omit<
  LabelTemplate,
  'createdAt' | 'updatedAt'
> {
  builtIn: boolean
}

export type Field = {
  key: string
  label: string
  type?: string
  options?: string[]
  optionLabels?: Record<string, string>
  required?: boolean
  min?: number
  max?: number
}
export const identificationFields: Field[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'species', label: 'Species', required: true },
  { key: 'morph', label: 'Subspecies / locale / morph' },
  { key: 'sex', label: 'Sex', options: ['unknown', 'male', 'female'] },
  { key: 'birthDate', label: 'Date of birth', type: 'date' },
  { key: 'estimatedAge', label: 'Estimated age (if birth date unknown)' },
  { key: 'acquiredDate', label: 'Acquisition date', type: 'date' },
  { key: 'source', label: 'Breeder / source' },
  {
    key: 'origin',
    label: 'Origin',
    options: ['unknown', 'captive-bred', 'wild-caught'],
  },
  { key: 'identifier', label: 'Identification number' },
  { key: 'attention', label: 'Requires attention', options: ['no', 'yes'] },
]
export const husbandryFields: Field[] = [
  { key: 'enclosure', label: 'Enclosure name / identifier' },
  { key: 'dimensions', label: 'Dimensions (include units)' },
  {
    key: 'enclosureType',
    label: 'Enclosure type',
    options: ['Screen', 'Glass', 'Hybrid', 'Other'],
  },
  { key: 'lighting', label: 'Lighting equipment' },
  { key: 'uvb', label: 'UVB equipment / bulb' },
  { key: 'unit', label: 'Temperature unit', options: ['C', 'F'] },
  { key: 'baskingTarget', label: 'Basking temperature target', type: 'number' },
  { key: 'ambientTarget', label: 'Ambient temperature target', type: 'number' },
  {
    key: 'humidityTarget',
    label: 'Humidity target (%)',
    type: 'number',
    min: 0,
    max: 100,
  },
  { key: 'misting', label: 'Misting schedule' },
  { key: 'fogging', label: 'Fogging schedule' },
  { key: 'substrate', label: 'Substrate' },
  { key: 'notes', label: 'Husbandry notes', type: 'textarea' },
]
export const environmentFields: Field[] = [
  { key: 'unit', label: 'Temperature unit', options: ['C', 'F'] },
  { key: 'basking', label: 'Basking temperature', type: 'number' },
  { key: 'ambient', label: 'Ambient temperature', type: 'number' },
  { key: 'overnight', label: 'Overnight temperature', type: 'number' },
  {
    key: 'dayHumidity',
    label: 'Daytime humidity (%)',
    type: 'number',
    min: 0,
    max: 100,
  },
  {
    key: 'nightHumidity',
    label: 'Nighttime humidity (%)',
    type: 'number',
    min: 0,
    max: 100,
  },
  { key: 'uvb', label: 'UVB equipment / bulb information' },
  { key: 'misting', label: 'Misting / fogging observations' },
]
export const healthFields: Field[] = [
  {
    key: 'category',
    label: 'Observation type',
    options: [
      'Veterinary appointment',
      'Fecal testing',
      'Shedding',
      'Medication',
      'Treatment',
      'Appetite concern',
      'Behaviour change',
      'Other observation',
    ],
  },
]
export const reproductiveFields: Field[] = [
  { key: 'gravid', label: 'Gravid observation' },
  { key: 'layingDate', label: 'Egg-laying date', type: 'date' },
  { key: 'clutchSize', label: 'Clutch size', type: 'number', min: 0 },
  { key: 'layingBin', label: 'Laying-bin observations' },
]
export function localDateTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

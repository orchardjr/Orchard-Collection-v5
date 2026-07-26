import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/database'
import {
  TemplateService,
  builtInLabelTemplates,
  normalizeLabelFields,
  validateLabelTemplate,
} from './TemplateService'

describe('TemplateService', () => {
  const service = new TemplateService()

  beforeEach(async () => {
    await db.labelTemplates.clear()
    localStorage.clear()
  })

  it('lists built-ins and manages custom templates', async () => {
    const custom = await service.save({
      name: 'My greenhouse label',
      widthIn: 3,
      heightIn: 1,
      fields: ['plantName', 'qrCode'],
      customFields: [],
      fontScale: 1,
      qrSizeIn: 0.7,
      barcodeHeightIn: 0.2,
    })
    const copy = await service.duplicate({
      ...custom,
      builtIn: false,
    })

    expect(await service.listCustom()).toHaveLength(2)
    expect(await service.list()).toHaveLength(builtInLabelTemplates.length + 2)
    expect(copy.name).toBe('My greenhouse label copy')
    await service.rename(custom.id, 'Renamed')
    expect((await service.list()).some(({ name }) => name === 'Renamed')).toBe(
      true,
    )

    service.setDefault(custom.id)
    expect(service.getDefaultId()).toBe(custom.id)
    await service.delete(custom.id)
    expect(service.getDefaultId()).toBe(builtInLabelTemplates[0]!.id)
  })

  it('validates templates and prevents case-insensitive duplicate names', async () => {
    const source = builtInLabelTemplates[0]!
    const custom = await service.saveAsCustom(source)
    expect(custom.name).toBe('Small DYMO address label custom')
    await expect(service.saveAsCustom(source)).resolves.toMatchObject({
      name: 'Small DYMO address label custom 2',
    })
    await expect(
      service.save({
        ...source,
        name: custom.name.toUpperCase(),
      }),
    ).rejects.toThrow('already exists')

    expect(
      validateLabelTemplate({
        ...source,
        name: '',
        fields: [],
        widthIn: 0,
        customFields: [{ id: 'long', label: 'Label', value: 'x'.repeat(241) }],
      }),
    ).toEqual(
      expect.arrayContaining([
        'Template name is required.',
        'Width must be between 0.5 and 24 inches.',
        'Select at least one label field.',
        'Custom labels are limited to 80 and values to 240 characters.',
      ]),
    )
  })

  it('preserves QR fields and safely normalizes legacy field names', async () => {
    const saved = await service.save({
      ...builtInLabelTemplates[0]!,
      name: 'QR persistence',
      fields: ['plantName', 'qrCode'],
    })

    expect((await service.listCustom())[0]?.fields).toContain('qrCode')
    expect(saved.fields).toContain('qrCode')
    expect(normalizeLabelFields(['plantName', 'qr', 'nfcUrl'])).toEqual([
      'plantName',
      'qrCode',
      'publicNfcUrl',
    ])
  })
})

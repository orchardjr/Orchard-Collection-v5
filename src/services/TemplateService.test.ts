import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/database'
import { TemplateService, builtInLabelTemplates } from './TemplateService'

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
})

import { describe, expect, it } from 'vitest'
import {
  estimatedHatchDate,
  feederQrUrl,
  isLowStock,
  maintenanceDueDate,
  nextRecordCode,
  resolveQrRoute,
} from './feederLogic'

describe('feeder calculations', () => {
  it('generates sequential IDs and hatch dates', () => {
    expect(nextRecordCode('DR-B', ['DR-B-001', 'DR-B-003'])).toBe('DR-B-004')
    expect(
      estimatedHatchDate(new Date('2026-07-01T12:00:00Z'), 10).toISOString(),
    ).toBe('2026-07-11T12:00:00.000Z')
  })
  it('calculates maintenance due from the newest matching event', () => {
    const base = {
      id: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      action: 'feeding' as const,
      occurredAt: new Date('2026-07-03T12:00:00Z'),
      colonyId: 'c1',
    }
    expect(
      maintenanceDueDate(
        [base],
        'feeding',
        3,
        new Date('2026-07-01'),
      ).toISOString(),
    ).toBe('2026-07-06T12:00:00.000Z')
  })
  it('detects low stock and resolves only valid QR routes', () => {
    expect(isLowStock(10, 10)).toBe(true)
    expect(resolveQrRoute('orchard:colony:DR-B-001')).toBe(
      '/feeders/colonies/DR-B-001',
    )
    expect(
      resolveQrRoute(
        'https://app.orchardcollection.ca/feeders/crickets/CR-E-001',
      ),
    ).toBe('/feeders/crickets/CR-E-001')
    expect(
      feederQrUrl(
        'orchard:inventory:INV-001',
        'https://app.orchardcollection.ca',
      ),
    ).toBe('https://app.orchardcollection.ca/feeders/inventory/INV-001')
    expect(resolveQrRoute('https://unsafe.example')).toBeUndefined()
    expect(
      resolveQrRoute('https://unsafe.example/feeders/settings'),
    ).toBeUndefined()
  })
})

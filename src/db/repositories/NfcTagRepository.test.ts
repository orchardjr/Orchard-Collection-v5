import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../database'
import { NfcTagRepository } from './NfcTagRepository'

describe('NfcTagRepository', () => {
  const repository = new NfcTagRepository()

  beforeEach(async () => {
    await db.nfcTags.clear()
  })

  it('records first and repeated scans atomically', async () => {
    const tag = await repository.assignTag({
      resourceType: 'plant',
      resourceId: 'plant-1',
      nickname: 'Greenhouse tag',
    })

    expect(tag.publicToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(await repository.findByToken(tag.publicToken)).toMatchObject({
      resourceId: 'plant-1',
    })
    expect(await repository.listAssigned()).toHaveLength(1)
    expect(await repository.listUnassigned()).toHaveLength(0)

    const firstScan = new Date('2026-07-25T12:00:00Z')
    const secondScan = new Date('2026-07-25T13:30:00Z')
    await repository.updateLastScan(tag.id, firstScan, 'Safari · iPhone')
    await repository.updateLastScan(tag.id, secondScan, 'Chrome · macOS')

    const scanned = await repository.getById(tag.id)
    expect(scanned).toMatchObject({
      scanCount: 2,
      firstScannedAt: firstScan,
      lastScannedAt: secondScan,
      lastScannedDevice: 'Chrome · macOS',
    })
    expect(scanned?.firstScannedAt).toEqual(firstScan)
    expect(scanned?.lastScannedAt).toEqual(secondScan)

    await repository.unassignTag(tag.id)
    expect(await repository.listAssigned()).toHaveLength(0)
    expect(await repository.listUnassigned()).toHaveLength(1)
  })

  it('initializes first-scan analytics once', async () => {
    const tag = await repository.assignTag({
      resourceType: 'plant',
      resourceId: 'plant-first-scan',
    })
    const scannedAt = new Date('2026-07-25T12:00:00Z')

    await repository.updateLastScan(tag.id, scannedAt, 'Mobile Safari')

    expect(await repository.getById(tag.id)).toMatchObject({
      scanCount: 1,
      firstScannedAt: scannedAt,
      lastScannedAt: scannedAt,
      lastScannedDevice: 'Mobile Safari',
    })
    expect((await repository.getById(tag.id))?.lastScannedAt).toEqual(
      new Date('2026-07-25T12:00:00Z'),
    )
  })

  it('replaces a tag while preserving its assignment', async () => {
    const original = await repository.assignTag({
      resourceType: 'plant',
      resourceId: 'plant-2',
      uid: '04-A1',
      nickname: 'Original tag',
    })
    const replacement = await repository.replaceTag(original.id)

    expect(replacement?.id).not.toBe(original.id)
    expect(replacement?.publicToken).not.toBe(original.publicToken)
    expect(replacement).toMatchObject({
      resourceType: 'plant',
      resourceId: 'plant-2',
      nickname: 'Original tag',
    })
    expect(replacement?.uid).toBeUndefined()
    expect((await repository.getById(original.id))?.resourceId).toBeUndefined()
    expect(await repository.listAssigned()).toHaveLength(1)
    expect(await repository.listUnassigned()).toHaveLength(1)
  })

  it('prevents more than one active tag assignment per resource', async () => {
    await repository.assignTag({
      resourceType: 'plant',
      resourceId: 'plant-3',
    })

    await expect(
      repository.assignTag({
        resourceType: 'plant',
        resourceId: 'plant-3',
      }),
    ).rejects.toThrow('already has an NFC tag')
  })
})

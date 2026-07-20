import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../database'
import { plantRepository } from './PlantRepository'
import { spaceRepository } from './SpaceRepository'
import { plantService } from '../../services/PlantService'
import { timelineRepository } from './TimelineRepository'
describe('SpaceRepository', () => {
  beforeEach(async () => {
    await Promise.all([
      db.spaces.clear(),
      db.plants.clear(),
      db.timeline.clear(),
    ])
  })
  it('supports CRUD, nesting, archive and restore', async () => {
    const room = await spaceRepository.create({
      name: 'Plant Room',
      type: 'plant-room',
    })
    const shelf = await spaceRepository.create({
      name: 'Shelf A',
      type: 'shelf',
      parentSpaceId: room.id,
    })
    expect((await spaceRepository.getChildren(room.id))[0]?.id).toBe(shelf.id)
    expect(
      (await spaceRepository.update(room.id, { description: 'Bright' }))
        ?.description,
    ).toBe('Bright')
    await spaceRepository.archive(room.id)
    expect(await spaceRepository.getActive()).toEqual([shelf])
    await spaceRepository.restore(room.id)
    expect(await spaceRepository.getActive()).toHaveLength(2)
  })
  it('counts plants and records reassignment without deleting plants', async () => {
    const a = await spaceRepository.create({ name: 'A', type: 'room' })
    const b = await spaceRepository.create({ name: 'B', type: 'room' })
    const plant = await plantRepository.create({
      nickname: 'Fern',
      scientificName: 'Fernus',
      kind: 'plant',
      status: 'active',
      favorite: false,
      spaceId: a.id,
    })
    expect(await spaceRepository.getPlantCount(a.id)).toBe(1)
    await plantService.update(plant.id, { spaceId: b.id })
    expect((await plantRepository.getById(plant.id))?.spaceId).toBe(b.id)
    expect((await timelineRepository.getByPlantId(plant.id))[0]?.title).toBe(
      'Space changed',
    )
    await spaceRepository.archive(b.id)
    expect(await plantRepository.getById(plant.id)).toBeDefined()
  })
})

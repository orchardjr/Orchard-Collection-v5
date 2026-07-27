import type { CreateInput, UpdateInput } from '../db/repositories'
import { spaceRepository } from '../db/repositories'
import type { Space } from '../models'

export class SpaceService {
  create(input: CreateInput<Space>) {
    return spaceRepository.create(input)
  }
  update(id: string, input: UpdateInput<Space>) {
    return spaceRepository.update(id, input)
  }
  archive(id: string) {
    return spaceRepository.archive(id)
  }
  restore(id: string) {
    return spaceRepository.restore(id)
  }
}

export const spaceService = new SpaceService()

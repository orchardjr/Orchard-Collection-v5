import type { LabelTemplate } from '../../models'
import { db } from '../database'
import { BaseRepository } from './BaseRepository'

export class LabelTemplateRepository extends BaseRepository<LabelTemplate> {
  constructor() {
    super(db.labelTemplates)
  }
}

export const localLabelTemplateRepository = new LabelTemplateRepository()

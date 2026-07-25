import type { LabelTemplate } from '../models'
import { SupabaseRepository } from './SupabaseRepository'

export class CloudLabelTemplateRepository extends SupabaseRepository<LabelTemplate> {
  constructor() {
    super('label_templates')
  }
}

export const cloudLabelTemplateRepository = new CloudLabelTemplateRepository()

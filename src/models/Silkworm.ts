import type { BaseRecord } from './BaseRecord'

export const silkwormStages = [
  'Eggs',
  'Diapause',
  'Incubating',
  'Hatching',
  'Larvae',
  'Cocoons',
  'Moths',
  'Closed',
] as const
export type SilkwormStage = (typeof silkwormStages)[number]

export interface SilkwormCohort extends BaseRecord {
  name: string
  source: string
  lineage: string
  parentCohortId: string | null
  stage: SilkwormStage
  location: string
  population: number | null
  eggsSet: number | null
  hatched: number | null
  incubationStart: string | null
  expectedHatch: string | null
  firstHatch: string | null
  targetTemp: number | null
  targetRh: number | null
  notes: string
}

export const silkwormEventKinds = [
  'Environment',
  'Feeding',
  'Moth pairing',
  'Egg laying',
  'Diapause',
  'Milestone',
] as const
export type SilkwormEventKind = (typeof silkwormEventKinds)[number]

export interface SilkwormEvent extends BaseRecord {
  cohortId: string
  kind: SilkwormEventKind
  occurredAt: Date
  details: Record<string, string>
  notes: string
}

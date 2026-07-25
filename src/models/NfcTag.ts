import type { BaseRecord } from './BaseRecord'

export type NfcResourceType = 'plant'

export interface NfcTag extends BaseRecord {
  publicToken: string
  resourceType: NfcResourceType
  resourceId?: string
  uid?: string
  nickname?: string
  notes?: string
  assignedAt?: Date
  scanCount: number
  firstScannedAt?: Date
  lastScannedAt?: Date
  lastScannedDevice?: string
}

export interface PublicNfcResolution {
  publicToken: string
  resourceType: NfcResourceType
  resourceId: string
  nickname?: string
}

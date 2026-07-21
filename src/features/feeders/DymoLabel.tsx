import type {
  CricketBatch,
  FeederColony,
  FeederInventoryItem,
} from '../../models/Feeder'
import { feederQrUrl } from './feederLogic'
import { FeederQrCode } from './QrCode'

export type DymoRecord = FeederColony | CricketBatch | FeederInventoryItem

interface DymoLabelProps {
  record: DymoRecord
  species: string
  onQrReady?: () => void
}

function labelCode(record: DymoRecord) {
  if ('colonyId' in record) return record.colonyId
  if ('batchId' in record) return record.batchId
  return record.inventoryId
}

function labelDates(record: DymoRecord) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  if ('colonyId' in record) {
    return [`Started ${formatter.format(record.dateStarted)}`]
  }
  if ('batchId' in record) {
    return [
      record.eggsMovedAt
        ? `Incubating ${formatter.format(record.eggsMovedAt)}`
        : `Created ${formatter.format(record.createdAt)}`,
      record.estimatedHatchAt
        ? `Hatch due ${formatter.format(record.estimatedHatchAt)}`
        : undefined,
    ].filter((value): value is string => Boolean(value))
  }
  return [
    `Added ${formatter.format(record.dateAdded)}`,
    record.useByAt ? `Use by ${formatter.format(record.useByAt)}` : undefined,
  ].filter((value): value is string => Boolean(value))
}

export function DymoLabel({ record, species, onQrReady }: DymoLabelProps) {
  const code = labelCode(record)
  const qrValue = feederQrUrl(record.qrValue, window.location.origin)

  return (
    <article className="dymo-label" aria-label={`DYMO label for ${code}`}>
      <div className="dymo-label-copy">
        <h1>{code}</h1>
        <p className="dymo-label-species">{species}</p>
        <div className="dymo-label-dates">
          {labelDates(record).map((date) => (
            <span key={date}>{date}</span>
          ))}
        </div>
        <p className="dymo-label-bin">
          Bin: {'binId' in record ? record.binId : record.storageBin}
        </p>
      </div>
      <div className="dymo-label-qr">
        <FeederQrCode value={qrValue} size={192} onReady={onQrReady} />
      </div>
    </article>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { DymoLabel, type DymoRecord } from '../../features/feeders/DymoLabel'
import { useFeederData } from '../../hooks/useFeederData'

function findRecord(
  type: string | undefined,
  id: string | undefined,
  data: ReturnType<typeof useFeederData>['data'],
): DymoRecord | undefined {
  if (!id || !data) return undefined
  if (type === 'colony')
    return data.colonies.find((item) => item.id === id || item.colonyId === id)
  if (type === 'cricket')
    return data.batches.find((item) => item.id === id || item.batchId === id)
  if (type === 'inventory')
    return data.inventory.find(
      (item) => item.id === id || item.inventoryId === id,
    )
  return undefined
}

export function DymoPrintPage() {
  const { type, id } = useParams()
  const query = useFeederData()
  const [qrReady, setQrReady] = useState(false)
  const printed = useRef(false)
  const record = findRecord(type, id, query.data)
  const speciesId = record
    ? 'speciesId' in record
      ? record.speciesId
      : query.data?.colonies.find(
          (colony) => colony.id === record.parentColonyId,
        )?.speciesId
    : undefined
  const species =
    query.data?.species.find((item) => item.id === speciesId)?.name ??
    'House Cricket'

  useEffect(() => {
    if (!qrReady || printed.current) return
    printed.current = true
    void document.fonts?.ready.then(() => window.print())
  }, [qrReady])

  if (query.isLoading)
    return <main className="dymo-print-status">Preparing label…</main>
  if (query.isError)
    return <main className="dymo-print-status">Unable to load this label.</main>
  if (!record)
    return <main className="dymo-print-status">Label record not found.</main>

  return (
    <main className="dymo-print-root">
      <div className="dymo-print-controls">
        <Button onClick={() => window.print()}>Print label</Button>
        <p>
          Printer settings: DYMO 450 Turbo, 2⅛&quot; × 4&quot; label, landscape,
          100% scale, margins none.
        </p>
      </div>
      <DymoLabel
        record={record}
        species={species}
        onQrReady={() => setQrReady(true)}
      />
    </main>
  )
}

import { Download, Radio, ScanLine, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '../../components/ui/Button'
import {
  getNfcCapability,
  nfcHardwareService,
  type NfcReadResult,
  type NfcWriteResult,
} from '../../services/NfcHardwareService'
import { downloadNfcQrCode } from '../../services/NfcQrCodeService'

type Operation = 'read' | 'write'

export function NfcHardwarePanel({ publicToken }: { publicToken: string }) {
  const capability = getNfcCapability()
  const controller = useRef<AbortController | null>(null)
  const [operation, setOperation] = useState<Operation>()
  const [readResult, setReadResult] = useState<NfcReadResult>()
  const [writeResult, setWriteResult] = useState<NfcWriteResult>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  const begin = (nextOperation: Operation) => {
    controller.current?.abort()
    controller.current = new AbortController()
    setOperation(nextOperation)
    setError(undefined)
    setMessage(undefined)
    return controller.current.signal
  }

  const finish = () => {
    controller.current = null
    setOperation(undefined)
  }

  const read = async () => {
    const signal = begin('read')
    setMessage('Hold the NFC tag near your device.')
    try {
      const result = await nfcHardwareService.readTag(signal)
      setReadResult(result)
      setMessage('NFC tag read successfully.')
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : 'The NFC tag could not be read.',
      )
    } finally {
      finish()
    }
  }

  const write = async () => {
    if (
      !window.confirm(
        'Write this Orchard URL to the NFC tag? Existing NDEF content on the tag may be replaced.',
      )
    )
      return
    const signal = begin('write')
    setWriteResult(undefined)
    setMessage(
      'Hold the tag near your device. After writing, tap it again to verify.',
    )
    try {
      const result = await nfcHardwareService.writeTag(publicToken, signal)
      setWriteResult(result)
      setReadResult(result.readBack)
      setMessage(
        result.verified
          ? 'NFC tag written and verified successfully.'
          : result.verificationError,
      )
    } catch (writeError) {
      setError(
        writeError instanceof Error
          ? writeError.message
          : 'The NFC tag could not be written.',
      )
    } finally {
      finish()
    }
  }

  return (
    <section className="mt-6 border-t border-border/70 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">NFC hardware</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Write the permanent public Orchard URL or inspect a nearby NDEF tag.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={!capability.supported || Boolean(operation)}
            onClick={() => void read()}
          >
            <ScanLine size={17} aria-hidden="true" />
            Read NFC Tag
          </Button>
          <Button
            disabled={!capability.supported || Boolean(operation)}
            onClick={() => void write()}
          >
            <Radio size={17} aria-hidden="true" />
            Write NFC Tag
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              void downloadNfcQrCode(publicToken).catch(() =>
                setError('The QR code could not be generated.'),
              )
            }
          >
            <Download size={17} aria-hidden="true" />
            Download QR
          </Button>
        </div>
      </div>

      {!capability.supported && (
        <p className="mt-4 rounded-2xl border border-border/70 bg-surface-muted p-4 text-sm leading-6 text-muted-foreground">
          {capability.reason}
        </p>
      )}

      {operation && (
        <div
          className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-4"
          aria-live="polite"
        >
          <p className="text-sm font-medium">{message}</p>
          <Button
            variant="ghost"
            className="shrink-0"
            onClick={() => controller.current?.abort()}
          >
            <X size={16} aria-hidden="true" />
            Cancel
          </Button>
        </div>
      )}

      {!operation && message && (
        <p
          role="status"
          className={`mt-4 rounded-2xl border p-4 text-sm font-medium ${
            writeResult?.verified !== false
              ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          }`}
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-600/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {readResult && <NfcReadDetails result={readResult} />}
    </section>
  )
}

function NfcReadDetails({ result }: { result: NfcReadResult }) {
  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
      <h4 className="font-semibold">Read result</h4>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">URL</dt>
          <dd className="mt-1 break-all font-medium">{result.url ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">UID</dt>
          <dd className="mt-1 font-medium">{result.uid ?? 'Unavailable'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tag type</dt>
          <dd className="mt-1 font-medium">{result.tagType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Orchard Collection tag</dt>
          <dd className="mt-1 font-medium">
            {result.belongsToOrchard ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <h5 className="text-sm font-semibold">NDEF records</h5>
        <ul className="mt-2 space-y-2">
          {result.records.map((record, index) => (
            <li
              key={`${record.recordType}-${record.id ?? index}`}
              className="rounded-xl bg-surface-muted p-3 text-xs leading-5"
            >
              <strong>{record.recordType}</strong>
              {record.mediaType ? ` · ${record.mediaType}` : ''}
              {record.data ? (
                <span className="mt-1 block break-all">{record.data}</span>
              ) : null}
            </li>
          ))}
          {!result.records.length && (
            <li className="rounded-xl bg-surface-muted p-3 text-xs text-muted-foreground">
              No NDEF records were found.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

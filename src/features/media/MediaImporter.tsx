import { Camera, ImagePlus, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import type { MediaImportResult } from '../../services/MediaService'
import { validateImageFile } from './mediaProcessing'

interface MediaImporterProps {
  disabled?: boolean
  onImport: (
    files: File[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<MediaImportResult[]>
}
interface QueueItem {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'saved' | 'failed'
  error?: string
  warning?: string
}

export function MediaImporter({ disabled, onImport }: MediaImporterProps) {
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const running = useRef(false)
  const mounted = useRef(true)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<QueueItem[]>([])
  useEffect(() => {
    mounted.current = true
    const warn = (event: BeforeUnloadEvent) => {
      if (running.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      mounted.current = false
      window.removeEventListener('beforeunload', warn)
    }
  }, [])
  const update = (id: string, patch: Partial<QueueItem>) => {
    if (mounted.current)
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      )
  }
  const run = async (batch: QueueItem[]) => {
    if (running.current || disabled || !batch.length) return
    running.current = true
    setBusy(true)
    for (const item of batch)
      update(item.id, {
        status: 'queued',
        error: undefined,
        warning: undefined,
      })
    try {
      // Sequential processing bounds memory and prevents two first photos
      // competing to become cover. A failure never blocks later files.
      for (const item of batch) {
        if (!mounted.current) break
        const invalid = validateImageFile(item.file)
        if (invalid) {
          update(item.id, { status: 'failed', error: invalid })
          continue
        }
        update(item.id, { status: 'uploading' })
        try {
          const [result] = await onImport([item.file], () => undefined)
          if (!result)
            throw new Error(
              'No upload result was returned. Check the gallery before retrying.',
            )
          update(item.id, {
            status: result.success ? 'saved' : 'failed',
            error: result.error,
            warning: result.warning,
          })
        } catch (error) {
          update(item.id, {
            status: 'failed',
            error:
              error instanceof Error ? error.message : 'Photo import failed.',
          })
        }
      }
    } finally {
      running.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const add = (files: File[]) => {
    if (running.current || disabled || !files.length) return
    const batch: QueueItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued',
    }))
    setItems((current) => [...current, ...batch])
    void run(batch)
  }
  const blocked = disabled || busy
  const saved = items.filter((item) => item.status === 'saved').length
  const failed = items.filter((item) => item.status === 'failed')
  const processed = saved + failed.length
  return (
    <div
      tabIndex={0}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!blocked) setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        add([...event.dataTransfer.files])
      }}
      onPaste={(event) => {
        const files = [...event.clipboardData.items]
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file))
        if (files.length) {
          event.preventDefault()
          add(files)
        }
      }}
      className={`rounded-[1.4rem] border-2 border-dashed p-4 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-accent/20 sm:p-6 ${dragging ? 'border-accent bg-accent-soft' : 'border-border bg-surface/60'}`}
      aria-label="Photo upload area. Drop files or paste an image."
    >
      <input
        ref={input}
        aria-label="Choose photos"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        disabled={blocked}
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          add(files)
        }}
      />
      <input
        ref={camera}
        aria-label="Camera photo"
        type="file"
        accept="image/*"
        capture="environment"
        disabled={blocked}
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          add(files)
        }}
      />
      <Upload className="mx-auto text-accent" aria-hidden="true" />
      <p className="mt-3 font-semibold">
        Take a photo or choose several at once
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Drop photos here or paste an image. JPEG, PNG, WebP, GIF, or AVIF · up
        to 25 MB each. For HEIC/HEIF, export as JPEG first.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          disabled={blocked}
          onClick={() => camera.current?.click()}
        >
          <Camera size={17} />
          Take photo
        </Button>
        <Button
          variant="secondary"
          disabled={blocked}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={17} />
          Add photos
        </Button>
      </div>
      {!!items.length && (
        <>
          <p role="status" className="mt-4 text-sm">
            {saved} saved · {failed.length} failed · {items.length - processed}{' '}
            remaining
          </p>
          {busy && (
            <>
              <progress
                aria-label="Photos processed"
                className="mt-2 w-full accent-accent"
                value={processed}
                max={items.length}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Preparing and saving photos. Keep this tab open; progress counts
                files, not bytes.
              </p>
            </>
          )}
          <ul
            aria-label="Photo upload queue"
            className="mt-3 max-h-80 space-y-2 overflow-y-auto text-left"
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 break-all text-sm font-semibold">
                    {item.file.name}
                  </span>
                  <span className="text-xs">
                    {
                      {
                        queued: 'Queued',
                        uploading: 'Preparing / uploading…',
                        saved: 'Saved',
                        failed: 'Failed',
                      }[item.status]
                    }
                  </span>
                </div>
                {item.error && (
                  <p
                    role="alert"
                    className="mt-1 break-words text-xs text-red-700"
                  >
                    {item.error}
                  </p>
                )}
                {item.warning && (
                  <p
                    role="status"
                    className="mt-1 break-words text-xs text-muted-foreground"
                  >
                    {item.warning}
                  </p>
                )}
                {item.status === 'failed' && (
                  <Button
                    variant="ghost"
                    className="mt-2"
                    disabled={blocked}
                    onClick={() => void run([item])}
                    aria-label={`Retry ${item.file.name}`}
                  >
                    Retry photo
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {!!failed.length && (
              <Button
                variant="secondary"
                disabled={blocked}
                onClick={() => void run(failed)}
              >
                Retry failed photos
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={blocked}
              onClick={() => setItems([])}
            >
              Clear upload list
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Clearing this list does not delete saved photos. Failed files are
            kept here only until you leave this tab.
          </p>
        </>
      )}
    </div>
  )
}

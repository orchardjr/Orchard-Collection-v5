import { ImagePlus, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '../../components/ui/Button'
import type { MediaImportResult } from '../../services/MediaService'

interface MediaImporterProps {
  disabled?: boolean
  onImport: (
    files: File[],
    onProgress: (done: number, total: number) => void,
  ) => Promise<MediaImportResult[]>
}

export function MediaImporter({ disabled, onImport }: MediaImporterProps) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<[number, number]>()
  const [results, setResults] = useState<MediaImportResult[]>([])
  const [batchError, setBatchError] = useState<string>()

  const importFiles = async (files: File[]) => {
    if (!files.length) return
    setProgress([0, files.length])
    setBatchError(undefined)
    try {
      const next = await onImport(files, (done, total) =>
        setProgress([done, total]),
      )
      setResults(next)
    } catch (error) {
      setBatchError(
        error instanceof Error ? error.message : 'Photo import failed.',
      )
    } finally {
      setProgress(undefined)
    }
  }

  return (
    <div
      tabIndex={0}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        void importFiles([...event.dataTransfer.files])
      }}
      onPaste={(event) => {
        const files = [...event.clipboardData.items]
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file))
        if (files.length) {
          event.preventDefault()
          void importFiles(files)
        }
      }}
      className={`rounded-[1.4rem] border-2 border-dashed p-6 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-accent/20 ${dragging ? 'border-accent bg-accent-soft' : 'border-border bg-surface/60'}`}
      aria-label="Photo upload area. Drop files or paste an image."
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="sr-only"
        onChange={(event) => void importFiles([...(event.target.files ?? [])])}
      />
      <Upload className="mx-auto text-accent" aria-hidden="true" />
      <p className="mt-3 font-semibold text-foreground">
        Drop photos here, or paste from your clipboard
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        JPEG, PNG, WebP, GIF, or AVIF · up to 25 MB each
      </p>
      <Button
        className="mt-4"
        variant="secondary"
        disabled={disabled || Boolean(progress)}
        onClick={() => input.current?.click()}
      >
        <ImagePlus size={17} /> Add photos
      </Button>
      {progress && (
        <div className="mx-auto mt-4 max-w-sm" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(progress[0] / progress[1]) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Importing {progress[0]} of {progress[1]}
          </p>
        </div>
      )}
      {results.length > 0 && (
        <p
          className="mt-3 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {results.filter((result) => result.success).length} imported ·{' '}
          {results.filter((result) => !result.success).length} skipped or failed
        </p>
      )}
      {results.some((result) => !result.success) && (
        <ul className="mt-2 text-xs text-red-600" role="alert">
          {results
            .filter((result) => !result.success)
            .map((result) => (
              <li key={result.fileName}>
                {result.fileName}: {result.error}
              </li>
            ))}
        </ul>
      )}
      {batchError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {batchError}
        </p>
      )}
      {results.length > 0 && (
        <ul className="sr-only" aria-label="Import results">
          {results.map((result, index) => (
            <li key={`${result.fileName}-${index}`}>
              {result.fileName}: {result.success ? 'imported' : result.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

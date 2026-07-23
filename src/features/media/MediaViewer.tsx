import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react'

import { Button } from '../../components/ui/Button'
import type { MediaAsset } from '../../models'
import { OrchardImage } from './OrchardImage'

interface MediaViewerProps {
  assets: MediaAsset[]
  initialId: string
  onClose: () => void
}

export function MediaViewer({ assets, initialId, onClose }: MediaViewerProps) {
  const initialIndex = Math.max(
    0,
    assets.findIndex((asset) => asset.id === initialId),
  )
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const touchStart = useRef<number | undefined>(undefined)
  const dialog = useRef<HTMLDivElement>(null)
  const asset = assets[index]
  const move = useCallback(
    (offset: number) => {
      setIndex((current) => (current + offset + assets.length) % assets.length)
      setZoom(1)
    },
    [assets.length],
  )

  useEffect(() => {
    const previous = document.body.style.overflow
    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
      if (event.key === '+' || event.key === '=')
        setZoom((value) => Math.min(4, value + 0.25))
      if (event.key === '-') setZoom((value) => Math.max(0.5, value - 0.25))
      if (event.key === '0') setZoom(1)
      if (event.key === 'Tab') {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [move, onClose])

  if (!asset) return null
  const metadata = [
    asset.width && asset.height
      ? `${asset.width} × ${asset.height}`
      : undefined,
    `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB`,
    asset.cameraMake,
    asset.cameraModel,
    asset.lensModel,
  ].filter(Boolean)

  return (
    <div
      ref={dialog}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo viewer: ${asset.fileName}`}
      onPointerDown={(event) => {
        touchStart.current = event.clientX
      }}
      onPointerUp={(event) => {
        if (touchStart.current === undefined) return
        const distance = event.clientX - touchStart.current
        if (Math.abs(distance) > 60) move(distance > 0 ? -1 : 1)
        touchStart.current = undefined
      }}
    >
      <div className="flex items-center gap-2 border-b border-white/15 p-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {asset.fileName}
        </p>
        <span className="text-sm text-white/70">
          {index + 1} / {assets.length}
        </span>
        <ViewerButton
          label="Zoom out"
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
        >
          <Minus />
        </ViewerButton>
        <ViewerButton
          label="Zoom in"
          onClick={() => setZoom((value) => Math.min(4, value + 0.25))}
        >
          <Plus />
        </ViewerButton>
        <ViewerButton label="Reset zoom" onClick={() => setZoom(1)}>
          <RotateCcw />
        </ViewerButton>
        <ViewerButton label="Fit to screen" onClick={() => setZoom(1)}>
          <Maximize2 />
        </ViewerButton>
        <ViewerButton autoFocus label="Close viewer" onClick={onClose}>
          <X />
        </ViewerButton>
      </div>
      <div
        className="relative flex min-h-0 flex-1"
        onClick={(event) => event.target === event.currentTarget && onClose()}
      >
        <ViewerButton
          label="Previous photo"
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2"
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </ViewerButton>
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto p-12">
          <OrchardImage
            blob={asset.blob}
            thumbnailBlob={asset.thumbnailBlob}
            src={asset.signedUrl}
            thumbnailSrc={asset.thumbnailUrl}
            preferOriginal
            alt={asset.notes || asset.fileName}
            loading="eager"
            className="max-h-full max-w-full"
            imageClassName="object-contain transition-transform motion-reduce:transition-none"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
        <ViewerButton
          label="Next photo"
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2"
          onClick={() => move(1)}
        >
          <ChevronRight />
        </ViewerButton>
        <aside className="hidden w-64 shrink-0 border-l border-white/15 p-5 lg:block">
          <h2 className="font-semibold">Details</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {metadata.map((value) => (
              <li key={String(value)}>{value}</li>
            ))}
          </ul>
          {asset.dateTaken && (
            <p className="mt-4 text-sm text-white/70">
              Taken {asset.dateTaken.toLocaleDateString()}
            </p>
          )}
          {asset.tags.length > 0 && (
            <p className="mt-4 text-sm text-white/70">
              {asset.tags.join(' · ')}
            </p>
          )}
          {asset.notes && (
            <p className="mt-4 text-sm leading-relaxed">{asset.notes}</p>
          )}
        </aside>
      </div>
      <div
        className="flex gap-2 overflow-x-auto border-t border-white/15 p-3"
        aria-label="Photo thumbnails"
      >
        {assets.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setIndex(itemIndex)
              setZoom(1)
            }}
            aria-label={`View ${item.fileName}`}
            aria-current={itemIndex === index}
            className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <OrchardImage
              blob={item.blob}
              thumbnailBlob={item.thumbnailBlob}
              src={item.signedUrl}
              thumbnailSrc={item.thumbnailUrl}
              alt=""
              className={`size-14 rounded-lg ${itemIndex === index ? 'ring-2 ring-white' : 'opacity-60'}`}
              imageClassName="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function ViewerButton({
  label,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="size-10 shrink-0 px-0 text-white hover:bg-white/15 hover:text-white"
      aria-label={label}
      {...props}
    />
  )
}

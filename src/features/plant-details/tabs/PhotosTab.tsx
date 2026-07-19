import { Image as ImageIcon, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { MediaAsset } from '../../../models'

interface PhotosTabProps {
  media: MediaAsset[]
}

function MediaImage({
  asset,
  className,
}: {
  asset: MediaAsset
  className: string
}) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div
      className={`${className} grid place-items-center bg-accent-soft text-accent`}
    >
      <ImageIcon size={34} aria-hidden="true" />
      <span className="sr-only">Image preview unavailable</span>
    </div>
  ) : (
    <img
      src={asset.url}
      alt={asset.altText || asset.name}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

function ImageViewer({
  asset,
  onClose,
}: {
  asset: MediaAsset
  onClose: () => void
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${asset.name}`}
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close image viewer"
      />
      <div className="relative max-h-full max-w-6xl">
        <MediaImage
          asset={asset}
          className="max-h-[88vh] max-w-full rounded-xl object-contain"
        />
        <Button
          autoFocus
          variant="secondary"
          className="absolute right-3 top-3 size-10 px-0"
          onClick={onClose}
          aria-label="Close image viewer"
        >
          <X size={19} />
        </Button>
        <p className="absolute inset-x-0 bottom-0 rounded-b-xl bg-black/60 px-4 py-3 text-sm text-white">
          {asset.name}
        </p>
      </div>
    </div>
  )
}

export function PhotosTab({ media }: PhotosTabProps) {
  const images = media.filter((asset) => asset.type === 'image')
  const [selected, setSelected] = useState<MediaAsset>()
  const hero = images[0]

  return (
    <div className="space-y-5">
      <Card
        title="Photos"
        description="Images stored with this collection item"
      >
        {hero ? (
          <button
            type="button"
            onClick={() => setSelected(hero)}
            className="group relative mb-4 block aspect-[16/8] w-full overflow-hidden rounded-2xl bg-accent-soft text-left"
          >
            <MediaImage
              asset={hero}
              className="size-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white">
              Hero image · Open fullscreen
            </span>
          </button>
        ) : (
          <div className="mb-4 grid aspect-[16/8] place-items-center rounded-2xl bg-accent-soft text-center text-accent">
            <div>
              <ImageIcon className="mx-auto" size={38} />
              <p className="mt-2 text-sm font-semibold">No hero image yet</p>
            </div>
          </div>
        )}

        {images.length > 1 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.slice(1).map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelected(asset)}
                className="group overflow-hidden rounded-xl border border-border bg-surface-muted text-left"
              >
                <MediaImage
                  asset={asset}
                  className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="block truncate px-3 py-2 text-xs font-medium text-foreground">
                  {asset.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {!images.length && (
          <p className="text-center text-sm text-muted-foreground">
            Photos added later will appear in this gallery.
          </p>
        )}
      </Card>

      <label
        className="grid min-h-40 cursor-not-allowed place-items-center rounded-2xl border-2 border-dashed border-border bg-surface/60 p-6 text-center"
        aria-disabled="true"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled
          className="sr-only"
        />
        <span>
          <Upload className="mx-auto text-accent" size={24} />
          <span className="mt-3 block text-sm font-semibold text-foreground">
            Local photo uploads
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Upload support is prepared for a future local-storage release.
          </span>
        </span>
      </label>

      {selected && (
        <ImageViewer asset={selected} onClose={() => setSelected(undefined)} />
      )}
    </div>
  )
}

import { Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

import { useObjectUrl } from '../../hooks/useObjectUrl'
import type { MediaAsset } from '../../models'
import { cn } from '../../lib/cn'

interface MediaThumbnailProps {
  asset: MediaAsset
  alt: string
  className?: string
}

export function MediaThumbnail({ asset, alt, className }: MediaThumbnailProps) {
  const url = useObjectUrl(asset.thumbnailBlob ?? asset.blob)
  const [failed, setFailed] = useState(false)

  if (!url || failed)
    return (
      <span
        className={cn(
          'grid place-items-center bg-accent-soft text-accent',
          className,
        )}
      >
        <ImageIcon aria-hidden="true" />
        <span className="sr-only">Preview unavailable for {alt}</span>
      </span>
    )

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

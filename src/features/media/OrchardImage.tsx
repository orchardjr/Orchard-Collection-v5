import { Image as ImageIcon } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'

import { cn } from '../../lib/cn'

interface OrchardImageProps {
  alt: string
  blob?: Blob
  thumbnailBlob?: Blob
  src?: string
  preferOriginal?: boolean
  className?: string
  imageClassName?: string
  loading?: 'eager' | 'lazy'
  style?: CSSProperties
}

function useBlobUrl(blob: Blob | undefined) {
  const [resource, setResource] = useState<{ blob: Blob; url: string }>()

  useEffect(() => {
    if (!blob) return
    const nextUrl = URL.createObjectURL(blob)
    // The URL is an external browser resource, so synchronizing it in an
    // effect is required. This also survives React Strict Mode's effect replay.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResource({ blob, url: nextUrl })
    return () => URL.revokeObjectURL(nextUrl)
  }, [blob])

  return blob && resource?.blob === blob ? resource.url : undefined
}

export function OrchardImage({
  alt,
  blob,
  className,
  imageClassName,
  loading = 'lazy',
  preferOriginal = false,
  src,
  style,
  thumbnailBlob,
}: OrchardImageProps) {
  const [useOriginal, setUseOriginal] = useState(preferOriginal)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const selectedBlob = useOriginal ? blob : (thumbnailBlob ?? blob)
  const objectUrl = useBlobUrl(selectedBlob)
  const imageSource = objectUrl ?? (!selectedBlob ? src : undefined)

  const handleError = () => {
    if (!useOriginal && thumbnailBlob && blob && thumbnailBlob !== blob) {
      setUseOriginal(true)
      return
    }
    setFailed(true)
  }

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {!loaded && !failed && (
        <span
          className="absolute inset-0 animate-pulse bg-surface-muted motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {failed || (!selectedBlob && !src) ? (
        <span className="absolute inset-0 grid place-items-center bg-accent-soft text-accent">
          <ImageIcon aria-hidden="true" />
          <span className="sr-only">Preview unavailable for {alt}</span>
        </span>
      ) : imageSource ? (
        <img
          src={imageSource}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={cn(
            'size-full transition-opacity motion-reduce:transition-none',
            loaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          style={style}
        />
      ) : null}
    </span>
  )
}

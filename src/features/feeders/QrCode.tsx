import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function FeederQrCode({
  value,
  size = 160,
  onReady,
}: {
  value: string
  size?: number
  onReady?: () => void
}) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    void QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((url) => {
      if (active) setSrc(url)
    })
    return () => {
      active = false
    }
  }, [size, value])
  return src ? (
    <img
      src={src}
      width={size}
      height={size}
      alt={`QR code for ${value}`}
      className="rounded-lg bg-white"
      onLoad={onReady}
    />
  ) : (
    <div
      className="size-40 animate-pulse rounded-lg bg-surface-muted"
      aria-label="Generating QR code"
    />
  )
}

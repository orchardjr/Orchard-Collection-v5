import { Camera, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { resolveQrRoute } from '../../features/feeders/feederLogic'

type Detector = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}
export function FeederScanPage() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  useEffect(
    () => () => streamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  )
  const lookup = (input = value) => {
    const route = resolveQrRoute(input.trim())
    if (route) navigate(route)
    else setError('Enter a valid Orchard feeder QR value.')
  }
  const startCamera = async () => {
    setError('')
    const BarcodeDetector = (window as Window & { BarcodeDetector?: Detector })
      .BarcodeDetector
    if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'Camera QR scanning is not supported by this browser. Use manual lookup.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setScanning(true)
      const detector = new BarcodeDetector({ formats: ['qr_code'] })
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return
        const [result] = await detector.detect(videoRef.current)
        if (result) {
          const route = resolveQrRoute(result.rawValue)
          if (route) {
            stream.getTracks().forEach((track) => track.stop())
            navigate(route)
            return
          }
        }
        window.setTimeout(() => void scan(), 500)
      }
      void scan()
    } catch {
      setError('Camera access was unavailable. Use manual lookup instead.')
      setScanning(false)
    }
  }
  return (
    <Page
      title="QR Scanner / Bin Lookup"
      subtitle="Scan with your camera where supported, or enter the label value."
    >
      <Card className="mx-auto max-w-xl">
        <div className="grid aspect-video place-items-center rounded-2xl border-2 border-dashed border-border bg-surface-muted">
          <video
            ref={videoRef}
            playsInline
            muted
            className={
              scanning ? 'h-full w-full rounded-2xl object-cover' : 'hidden'
            }
            aria-label="QR camera preview"
          />
          {!scanning && (
            <>
              <Camera size={48} className="text-muted-foreground" />
              <p className="px-5 text-center text-sm text-muted-foreground">
                Camera scanning uses the browser’s secure camera API. Manual
                lookup is always available.
              </p>
            </>
          )}
        </div>
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => void startCamera()}
          disabled={scanning}
        >
          <Camera size={18} />
          {scanning ? 'Scanning…' : 'Start camera scanner'}
        </Button>
        <label className="mt-5 block text-sm font-semibold">
          QR identifier
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="orchard:colony:DR-B-001"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base"
          />
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <Button className="mt-4 w-full" onClick={() => lookup()}>
          <Search size={18} />
          Open record
        </Button>
      </Card>
    </Page>
  )
}

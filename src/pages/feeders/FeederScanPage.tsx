import { Camera, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { resolveQrRoute } from '../../features/feeders/feederLogic'
import { decodeQrVideoFrame } from '../../features/feeders/qrScanner'

type Detector = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}
export function FeederScanPage() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const timerRef = useRef<number | undefined>(undefined)
  const stopCamera = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = undefined
  }, [])
  useEffect(() => () => stopCamera(), [stopCamera])
  const lookup = (input = value) => {
    const route = resolveQrRoute(input.trim())
    if (route) navigate(route)
    else setError('Enter a valid Orchard feeder QR value.')
  }
  const startCamera = async () => {
    setError('')
    const BarcodeDetector = (window as Window & { BarcodeDetector?: Detector })
      .BarcodeDetector
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported here. Use manual lookup.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (!videoRef.current) {
        stopCamera()
        return
      }
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setScanning(true)
      const detector = BarcodeDetector
        ? new BarcodeDetector({ formats: ['qr_code'] })
        : undefined
      const scan = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          let rawValue: string | undefined
          if (detector) {
            try {
              rawValue = (await detector.detect(videoRef.current))[0]?.rawValue
            } catch {
              // Fall through to the canvas decoder when the native API fails.
            }
          }
          if (!rawValue && canvasRef.current)
            rawValue = decodeQrVideoFrame(videoRef.current, canvasRef.current)
          const route = rawValue ? resolveQrRoute(rawValue) : undefined
          if (route) {
            stopCamera()
            navigate(route)
            return
          }
        } catch {
          // A frame can fail while the camera is focusing; keep scanning.
        }
        timerRef.current = window.setTimeout(() => void scan(), 350)
      }
      void scan()
    } catch {
      stopCamera()
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
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
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
          onClick={() => {
            if (scanning) {
              stopCamera()
              setScanning(false)
            } else void startCamera()
          }}
        >
          <Camera size={18} />
          {scanning ? 'Stop camera scanner' : 'Start camera scanner'}
        </Button>
        <label className="mt-5 block text-sm font-semibold">
          QR identifier
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://app.orchardcollection.ca/feeders/colonies/DR-B-001"
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

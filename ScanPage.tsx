import { Camera, Radio, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Page } from '../components/ui/Page'
import { decodeQrVideoFrame } from '../features/feeders/qrScanner'
import { resolveScanRoute } from '../features/scan/resolveScanRoute'
import {
  getNfcCapability,
  nfcHardwareService,
} from '../services/NfcHardwareService'

type Detector = new (options: { formats: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}

export function ScanPage() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [scanningQr, setScanningQr] = useState(false)
  const [scanningNfc, setScanningNfc] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
 const streamRef = useRef<MediaStream | undefined>(undefined)
const timerRef = useRef<number | undefined>(undefined)
const nfcController = useRef<AbortController | undefined>(undefined)
  const nfcCapability = getNfcCapability()
  const cameraSupported = Boolean(navigator.mediaDevices?.getUserMedia)

  const stopQr = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current)
    timerRef.current = undefined
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = undefined
    setScanningQr(false)
  }, [])

  const openScannedValue = useCallback(
    (input: string) => {
      const route = resolveScanRoute(input, window.location.origin)
      if (!route) return false
      stopQr()
      nfcController.current?.abort()
      navigate(route)
      return true
    },
    [navigate, stopQr],
  )

  useEffect(
    () => () => {
      stopQr()
      nfcController.current?.abort()
    },
    [stopQr],
  )

  const startQr = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return stopQr()
      video.srcObject = stream
      await video.play()
      setScanningQr(true)
      const NativeDetector = (window as Window & { BarcodeDetector?: Detector })
        .BarcodeDetector
      const detector = NativeDetector
        ? new NativeDetector({ formats: ['qr_code'] })
        : undefined

      const scanFrame = async () => {
        if (!streamRef.current || !videoRef.current) return
        let rawValue: string | undefined
        try {
          rawValue = detector
            ? (await detector.detect(videoRef.current))[0]?.rawValue
            : undefined
        } catch {
          // Safari-compatible canvas decoding remains available.
        }
        if (!rawValue && canvasRef.current)
          rawValue = decodeQrVideoFrame(videoRef.current, canvasRef.current)
        if (rawValue && openScannedValue(rawValue)) return
        timerRef.current = window.setTimeout(() => void scanFrame(), 350)
      }
      void scanFrame()
    } catch {
      stopQr()
      setError(
        'Camera access was unavailable. Check browser permission or paste the QR URL below.',
      )
    }
  }

  const startNfc = async () => {
    setError('')
    const controller = new AbortController()
    nfcController.current = controller
    setScanningNfc(true)
    try {
      const result = await nfcHardwareService.readTag(controller.signal)
      if (!result.url || !openScannedValue(result.url))
        setError('This NFC tag does not contain a recognized Orchard URL.')
    } catch (scanError) {
      if (!controller.signal.aborted)
        setError(
          scanError instanceof Error
            ? scanError.message
            : 'The NFC tag could not be read.',
        )
    } finally {
      nfcController.current = undefined
      setScanningNfc(false)
    }
  }

  const submitManual = () => {
    setError('')
    if (!openScannedValue(value))
      setError('Enter a valid Orchard plant, NFC, or feeder label URL.')
  }

  return (
    <Page
      title="Scan"
      subtitle="Open a collection record with its QR code or NFC tag."
    >
      <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card title="Scan QR Code" description="Use your device camera.">
          <div className="grid aspect-video place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-muted">
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="QR camera preview"
              className={scanningQr ? 'h-full w-full object-cover' : 'hidden'}
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
            {!scanningQr && (
              <Camera
                size={52}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
          {cameraSupported ? (
            <Button
              className="mt-4 min-h-12 w-full"
              onClick={() => (scanningQr ? stopQr() : void startQr())}
            >
              {scanningQr ? <X size={18} /> : <Camera size={18} />}
              {scanningQr ? 'Stop QR Scanner' : 'Scan QR Code'}
            </Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Camera scanning is unavailable in this browser. Paste the QR URL
              below instead.
            </p>
          )}
        </Card>

        {nfcCapability.supported && (
          <Card title="Scan NFC Tag" description="Hold a tag near your device.">
            <div className="grid aspect-video place-items-center rounded-2xl border-2 border-dashed border-border bg-surface-muted">
              <Radio
                size={52}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <Button
              className="mt-4 min-h-12 w-full"
              disabled={scanningNfc}
              onClick={() => void startNfc()}
            >
              <Radio size={18} />
              {scanningNfc ? 'Hold tag near device…' : 'Scan NFC Tag'}
            </Button>
          </Card>
        )}

        <Card
          title="Open from label URL"
          description="Available when camera or NFC scanning is unsupported."
          className="lg:col-span-2"
        >
          <label className="block text-sm font-semibold">
            Orchard URL
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://app.orchardcollection.ca/collection/…"
              className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>
          <Button
            variant="secondary"
            className="mt-4 min-h-12 w-full"
            onClick={submitManual}
          >
            <Search size={18} />
            Open record
          </Button>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </Card>
      </div>
    </Page>
  )
}

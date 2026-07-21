import jsQR from 'jsqr'
import { describe, expect, it, vi } from 'vitest'
import { decodeQrVideoFrame } from './qrScanner'

vi.mock('jsqr', () => ({
  default: vi.fn(() => ({
    data: 'https://app.orchardcollection.ca/feeders/colonies/DR-B-001',
  })),
}))

describe('Safari QR scanner fallback', () => {
  it('decodes the current camera frame through a canvas', () => {
    const video = document.createElement('video')
    Object.defineProperties(video, {
      readyState: { value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoWidth: { value: 320 },
      videoHeight: { value: 240 },
    })
    const canvas = document.createElement('canvas')
    const context = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(320 * 240 * 4),
      })),
    }
    vi.spyOn(canvas, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )

    expect(decodeQrVideoFrame(video, canvas)).toBe(
      'https://app.orchardcollection.ca/feeders/colonies/DR-B-001',
    )
    expect(context.drawImage).toHaveBeenCalledWith(video, 0, 0, 320, 240)
    expect(jsQR).toHaveBeenCalled()
  })
})

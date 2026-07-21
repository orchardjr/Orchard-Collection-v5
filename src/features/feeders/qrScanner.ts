import jsQR from 'jsqr'

export function decodeQrVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return undefined
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return undefined

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return undefined

  context.drawImage(video, 0, 0, width, height)
  const image = context.getImageData(0, 0, width, height)
  return jsQR(image.data, width, height, {
    inversionAttempts: 'attemptBoth',
  })?.data
}

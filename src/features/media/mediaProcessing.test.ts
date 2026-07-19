import { afterEach, describe, expect, it, vi } from 'vitest'

import { prepareMediaFile } from './mediaProcessing'

describe('prepareMediaFile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps the original Blob and creates a thumbnail with dimensions', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 1200, height: 800, close }),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['thumbnail'], { type: 'image/webp' })),
    )

    const file = new File(['image bytes'], 'leaf.png', { type: 'image/png' })
    const result = await prepareMediaFile(file, 'plant-a', true)

    expect(result.blob).toBe(file)
    expect(result.thumbnailBlob).toBeInstanceOf(Blob)
    expect(result).toMatchObject({ width: 1200, height: 800, isHero: true })
    expect(close).toHaveBeenCalledOnce()
  })
})

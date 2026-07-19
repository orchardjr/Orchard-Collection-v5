import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OrchardImage } from './OrchardImage'

describe('OrchardImage', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>()
  const revokeObjectURL = vi.fn<(url: string) => void>()

  beforeEach(() => {
    let sequence = 0
    createObjectURL.mockImplementation(() => `blob:orchard-${++sequence}`)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
  })

  afterEach(() => vi.clearAllMocks())

  it('recreates a usable URL after Strict Mode effect cleanup', async () => {
    render(
      <StrictMode>
        <OrchardImage alt="Leaf" blob={new Blob(['original'])} />
      </StrictMode>,
    )

    const image = await screen.findByRole('img', { name: 'Leaf' })
    await waitFor(() =>
      expect(image.getAttribute('src')).toBe('blob:orchard-2'),
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:orchard-1')
  })

  it('retries the original Blob when thumbnail decoding fails', async () => {
    const { unmount } = render(
      <OrchardImage
        alt="Bloom"
        blob={new Blob(['original'])}
        thumbnailBlob={new Blob(['thumbnail'])}
      />,
    )
    const thumbnail = await screen.findByRole('img', { name: 'Bloom' })
    expect(thumbnail.getAttribute('src')).toBe('blob:orchard-1')
    fireEvent.error(thumbnail)
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Bloom' }).getAttribute('src'),
      ).toBe('blob:orchard-2'),
    )
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:orchard-2')
  })
})

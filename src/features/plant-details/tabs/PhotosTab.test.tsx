import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '../../../models'
const mocks = vi.hoisted(() => ({ hero: vi.fn(), upload: vi.fn() }))
vi.mock('../../../hooks/useOrchardData', () => ({
  useMediaMutations: () => ({
    setHero: { mutate: mocks.hero },
    importMedia: { mutateAsync: mocks.upload },
    updateNotes: {},
    updateTags: {},
    toggleFavorite: {},
    deleteMedia: {},
  }),
}))
import { PhotosTab } from './PhotosTab'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.upload.mockImplementation(async ({ files }: { files: File[] }) =>
    files.map((file) => ({ fileName: file.name, success: true })),
  )
})
describe('plant photo quick actions', () => {
  it('assigns camera and multi-file uploads to the current plant', async () => {
    render(<PhotosTab plantId="current-plant" media={[]} />)
    fireEvent.change(screen.getByLabelText('Choose photos'), {
      target: {
        files: [
          new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
          new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
        ],
      },
    })
    await screen.findByText('2 saved · 0 failed · 0 remaining')
    expect(mocks.upload).toHaveBeenCalledTimes(2)
    expect(
      mocks.upload.mock.calls.every(
        ([args]) => args.plantId === 'current-plant',
      ),
    ).toBe(true)
  })
  it('changes cover directly from the gallery without re-uploading', async () => {
    const asset = {
      id: 'photo',
      plantId: 'p',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      tags: [],
      isHero: false,
      signedUrl: '/photo.jpg',
    } as unknown as MediaAsset
    render(<PhotosTab plantId="p" media={[asset]} />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Use photo.jpg as cover' }),
    )
    await waitFor(() => expect(mocks.hero).toHaveBeenCalledWith(asset))
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})

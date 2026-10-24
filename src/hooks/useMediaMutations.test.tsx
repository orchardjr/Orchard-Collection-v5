import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mediaService } from '../services/MediaService'
import { useMediaMutations } from './useOrchardData'
import type { MediaAsset } from '../models'
afterEach(() => vi.restoreAllMocks())
describe('media refresh after partial failure', () => {
  it.each(['import', 'cover'])(
    'refreshes all related queries even when %s fails',
    async (operation) => {
      const client = new QueryClient()
      const invalidate = vi.spyOn(client, 'invalidateQueries')
      vi.spyOn(mediaService, 'importFiles').mockRejectedValue(
        new Error('upload error'),
      )
      vi.spyOn(mediaService, 'setHero').mockRejectedValue(
        new Error('cover error'),
      )
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      )
      const { result, unmount } = renderHook(() => useMediaMutations(), {
        wrapper,
      })
      await act(async () => {
        const request =
          operation === 'import'
            ? result.current.importMedia.mutateAsync({
                plantId: 'p',
                files: [],
              })
            : result.current.setHero.mutateAsync({
                id: 'm',
                plantId: 'p',
              } as MediaAsset)
        await expect(request).rejects.toThrow('error')
      })
      for (const key of ['media', 'plants', 'timeline', 'dashboard'])
        expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] })
      unmount()
      client.clear()
    },
  )
})

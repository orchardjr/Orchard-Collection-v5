import { Heart, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { MediaAssetEditor } from '../../media/MediaAssetEditor'
import { MediaImporter } from '../../media/MediaImporter'
import { MediaThumbnail } from '../../media/MediaThumbnail'
import { MediaViewer } from '../../media/MediaViewer'
import { useMediaMutations } from '../../../hooks/useOrchardData'
import type { MediaAsset } from '../../../models'

interface PhotosTabProps {
  plantId: string
  media: MediaAsset[]
}

export function PhotosTab({ plantId, media }: PhotosTabProps) {
  const mutations = useMediaMutations()
  const [selectedId, setSelectedId] = useState<string>()
  const [viewerId, setViewerId] = useState<string>()
  const selected = media.find((asset) => asset.id === selectedId)
  const hero = media.find((asset) => asset.isHero) ?? media[0]
  const busy = Object.values(mutations).some((mutation) => mutation.isPending)

  const save = async (asset: MediaAsset, notes: string, tags: string[]) => {
    await Promise.all([
      mutations.updateNotes.mutateAsync({ asset, notes }),
      mutations.updateTags.mutateAsync({ asset, tags }),
    ])
  }

  return (
    <div className="space-y-6">
      {hero ? (
        <button
          type="button"
          onClick={() => setViewerId(hero.id)}
          className="group relative block aspect-[16/8] w-full overflow-hidden rounded-[1.4rem] bg-accent-soft text-left focus-visible:ring-4 focus-visible:ring-accent/20"
        >
          <MediaThumbnail
            asset={hero}
            alt={`${hero.fileName}, hero photo`}
            className="size-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transition-none"
          />
          <Badge
            variant="accent"
            className="absolute bottom-4 left-4 shadow-sm"
          >
            Hero image · Open fullscreen
          </Badge>
        </button>
      ) : (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="Add the first visual record for this collection item."
        />
      )}

      {media.length > 0 && (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          aria-label="Plant photo gallery"
        >
          {media.map((asset) => (
            <article
              key={asset.id}
              className={`group relative overflow-hidden rounded-2xl border bg-surface shadow-card ${selectedId === asset.id ? 'border-accent ring-2 ring-accent/15' : 'border-border'}`}
            >
              <button
                type="button"
                onClick={() => setViewerId(asset.id)}
                className="block aspect-square w-full overflow-hidden focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-accent/30"
                aria-label={`Open ${asset.fileName} fullscreen`}
              >
                <MediaThumbnail
                  asset={asset}
                  alt={asset.notes || asset.fileName}
                  className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none"
                />
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(asset.id)}
                className="flex w-full items-center gap-2 p-3 text-left text-xs font-semibold focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-accent/20"
              >
                <span className="min-w-0 flex-1 truncate">
                  {asset.fileName}
                </span>
                {asset.isHero && <Badge variant="accent">Hero</Badge>}
                {asset.isFavorite && (
                  <Heart
                    size={14}
                    className="text-red-500"
                    fill="currentColor"
                    aria-label="Favorite"
                  />
                )}
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <MediaAssetEditor
          key={selected.id}
          asset={selected}
          busy={busy}
          onSetHero={() => void mutations.setHero.mutateAsync(selected)}
          onFavorite={() => void mutations.toggleFavorite.mutateAsync(selected)}
          onSave={(notes, tags) => void save(selected, notes, tags)}
          onDelete={() => {
            if (
              window.confirm(
                `Delete ${selected.fileName}? This cannot be undone.`,
              )
            ) {
              void mutations.deleteMedia.mutateAsync(selected)
              setSelectedId(undefined)
            }
          }}
        />
      )}

      <MediaImporter
        disabled={busy}
        onImport={(files, onProgress) =>
          mutations.importMedia.mutateAsync({ plantId, files, onProgress })
        }
      />
      {viewerId && (
        <MediaViewer
          assets={media}
          initialId={viewerId}
          onClose={() => setViewerId(undefined)}
        />
      )}
    </div>
  )
}

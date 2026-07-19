import { Heart, Image, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import type { MediaAsset } from '../../models'

interface MediaAssetEditorProps {
  asset: MediaAsset
  busy: boolean
  onDelete: () => void
  onFavorite: () => void
  onSave: (notes: string, tags: string[]) => void
  onSetHero: () => void
}

export function MediaAssetEditor({
  asset,
  busy,
  onDelete,
  onFavorite,
  onSave,
  onSetHero,
}: MediaAssetEditorProps) {
  const [notes, setNotes] = useState(asset.notes ?? '')
  const [tags, setTags] = useState(asset.tags.join(', '))
  return (
    <Card title="Photo details" description={asset.fileName}>
      <div className="mb-4 flex flex-wrap gap-2">
        {asset.isHero && <Badge variant="accent">Hero</Badge>}
        {asset.isFavorite && <Badge variant="neutral">Favorite</Badge>}
      </div>
      <label className="block text-sm font-semibold text-foreground">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-border bg-background p-3 font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </label>
      <label className="mt-4 block text-sm font-semibold text-foreground">
        Tags
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="growth, spring, bloom"
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </label>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() =>
            onSave(
              notes,
              tags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            )
          }
        >
          <Save size={16} /> Save
        </Button>
        {!asset.isHero && (
          <Button variant="secondary" disabled={busy} onClick={onSetHero}>
            <Image size={16} /> Set hero
          </Button>
        )}
        <Button variant="ghost" disabled={busy} onClick={onFavorite}>
          <Heart size={16} fill={asset.isFavorite ? 'currentColor' : 'none'} />{' '}
          {asset.isFavorite ? 'Unfavorite' : 'Favorite'}
        </Button>
        <Button variant="danger" disabled={busy} onClick={onDelete}>
          <Trash2 size={16} /> Delete
        </Button>
      </div>
    </Card>
  )
}

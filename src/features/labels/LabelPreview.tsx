import { LoaderCircle } from 'lucide-react'

import type { RenderedLabel } from '../../services/LabelService'

interface LabelPreviewProps {
  label?: RenderedLabel
  loading?: boolean
}

export function LabelPreview({ label, loading }: LabelPreviewProps) {
  return (
    <div className="flex min-h-72 items-center justify-center overflow-auto rounded-2xl border border-dashed border-border bg-surface-muted p-5">
      {loading ? (
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      ) : label ? (
        <div
          className="max-w-full overflow-hidden bg-white shadow-xl"
          style={{
            aspectRatio: `${label.widthIn}/${label.heightIn}`,
            width: `min(100%, ${label.widthIn * 120}px)`,
          }}
          dangerouslySetInnerHTML={{ __html: label.svg }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a plant to preview its label.
        </p>
      )}
    </div>
  )
}

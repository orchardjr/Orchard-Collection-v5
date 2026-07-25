import { Copy, Radio, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PropertyField } from '../../components/ui/PropertyField'
import type { NfcTag } from '../../models'
import { AssignNfcTagDialog } from './AssignNfcTagDialog'

interface NfcTagSectionProps {
  plantName: string
  tag?: NfcTag
  loading: boolean
  pending: boolean
  error?: string
  onAssign: (input: {
    nickname?: string
    notes?: string
    uid?: string
  }) => Promise<void>
  onReplace: () => Promise<void>
  onRemove: () => Promise<void>
  onResetError: () => void
}

function publicUrl(token: string) {
  return `${window.location.origin}/nfc/${token}`
}

export function NfcTagSection({
  error,
  loading,
  onAssign,
  onRemove,
  onReplace,
  onResetError,
  pending,
  plantName,
  tag,
}: NfcTagSectionProps) {
  const [assigning, setAssigning] = useState(false)
  const [copied, setCopied] = useState(false)

  if (loading)
    return (
      <Card title="NFC Tag">
        <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
      </Card>
    )

  const close = () => {
    onResetError()
    setAssigning(false)
  }

  if (!tag)
    return (
      <>
        <Card
          title="NFC Tag"
          description="Link a reusable NFC tag record to this plant."
          action={
            <Button onClick={() => setAssigning(true)}>
              <Radio size={17} aria-hidden="true" />
              Assign NFC Tag
            </Button>
          }
        >
          <p className="text-sm leading-6 text-muted-foreground">
            No NFC tag is assigned. Phase 1 creates the permanent URL; writing
            that URL to physical NFC hardware will be added later.
          </p>
        </Card>
        {assigning && (
          <AssignNfcTagDialog
            plantName={plantName}
            pending={pending}
            error={error}
            onClose={close}
            onAssign={async (input) => {
              await onAssign(input)
              close()
            }}
          />
        )}
      </>
    )

  const url = publicUrl(tag.publicToken)
  return (
    <Card
      title="NFC Tag"
      description="This permanent URL resolves to the assigned plant."
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={async () => {
              if (
                window.confirm(
                  'Replace this tag? The current public URL will stop resolving to this plant.',
                )
              )
                await onReplace().catch(() => undefined)
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Replace
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={async () => {
              if (
                window.confirm(
                  'Remove this NFC tag from the plant? Its public URL will no longer resolve.',
                )
              )
                await onRemove().catch(() => undefined)
            }}
          >
            <Trash2 size={16} aria-hidden="true" />
            Remove
          </Button>
        </div>
      }
    >
      <dl className="grid gap-3 md:grid-cols-2">
        <PropertyField label="Nickname" value={tag.nickname} />
        <PropertyField label="Total scans" value={tag.scanCount} />
        <PropertyField
          label="First scanned"
          value={
            tag.firstScannedAt
              ? tag.firstScannedAt.toLocaleString()
              : 'Never scanned'
          }
        />
        <PropertyField
          label="Last scanned"
          value={
            tag.lastScannedAt
              ? tag.lastScannedAt.toLocaleString()
              : 'Never scanned'
          }
        />
        <div className="min-w-0 rounded-2xl border border-border/70 bg-background/70 p-4 md:col-span-2">
          <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Public URL
          </dt>
          <dd className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              className="min-w-0 break-all text-sm font-semibold text-accent underline-offset-4 hover:underline"
              href={url}
            >
              {url}
            </a>
            <Button
              variant="ghost"
              className="shrink-0 self-start"
              onClick={async () => {
                await navigator.clipboard.writeText(url)
                setCopied(true)
              }}
            >
              <Copy size={16} aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </dd>
        </div>
      </dl>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </Card>
  )
}

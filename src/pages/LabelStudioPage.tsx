import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileImage, FileText, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Page } from '../components/ui/Page'
import { LabelPreview } from '../features/labels/LabelPreview'
import { PlantBatchSelector } from '../features/labels/PlantBatchSelector'
import { TemplateEditor } from '../features/labels/TemplateEditor'
import { usePlants, useSpaces } from '../hooks/useOrchardData'
import { nfcTagRepository } from '../db/repositories'
import type { LabelTemplateDefinition } from '../models'
import {
  labelService,
  type LabelRenderInput,
  type RenderedLabel,
} from '../services/LabelService'
import { templateService } from '../services/TemplateService'

export function LabelStudioPage() {
  const { data: plants = [], isLoading: plantsLoading } = usePlants()
  const { data: spaces = [] } = useSpaces()
  const { data: tags = [] } = useQuery({
    queryKey: ['nfc-tags', 'assigned'],
    queryFn: () => nfcTagRepository.listAssigned(),
  })
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['label-templates'],
    queryFn: () => templateService.list(),
  })
  const queryClient = useQueryClient()
  const [templateId, setTemplateId] = useState(templateService.getDefaultId())
  const [draft, setDraft] = useState<LabelTemplateDefinition>()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [defaultId, setDefaultId] = useState(templateService.getDefaultId())
  const selectedTemplate =
    templates.find(({ id }) => id === templateId) ??
    templates.find(({ id }) => id === defaultId) ??
    templates[0]
  const activeTemplate =
    draft?.id === selectedTemplate?.id ? draft : selectedTemplate

  const inputs = useMemo<LabelRenderInput[]>(() => {
    if (!activeTemplate) return []
    const spacesById = new Map(spaces.map((space) => [space.id, space.name]))
    const tokensByPlant = new Map(
      tags
        .filter((tag) => tag.resourceId)
        .map((tag) => [tag.resourceId!, tag.publicToken]),
    )
    return plants
      .filter((plant) => selected.has(plant.id))
      .map((plant) => ({
        plant,
        template: activeTemplate,
        nfcToken: tokensByPlant.get(plant.id),
        location: plant.spaceId ? spacesById.get(plant.spaceId) : undefined,
      }))
  }, [activeTemplate, plants, selected, spaces, tags])
  const { data: preview, isFetching: previewing } = useQuery({
    queryKey: ['label-preview', inputs[0]],
    queryFn: () => labelService.render(inputs[0]!),
    enabled: Boolean(inputs[0]),
  })

  const templateMutation = useMutation({
    mutationFn: async (action: 'save' | 'duplicate' | 'delete') => {
      if (!activeTemplate) return
      if (action === 'delete') return templateService.delete(activeTemplate.id)
      if (action === 'duplicate')
        return templateService.duplicate(activeTemplate)
      const editable = {
        name: activeTemplate.name.trim(),
        widthIn: activeTemplate.widthIn,
        heightIn: activeTemplate.heightIn,
        fields: activeTemplate.fields,
        customFields: activeTemplate.customFields,
        fontScale: activeTemplate.fontScale,
        qrSizeIn: activeTemplate.qrSizeIn,
        barcodeHeightIn: activeTemplate.barcodeHeightIn,
      }
      return activeTemplate.builtIn
        ? templateService.save(editable)
        : templateService.update(activeTemplate.id, editable)
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['label-templates'] })
      if (result && typeof result === 'object' && 'id' in result) {
        setTemplateId(result.id)
        setDraft({ ...result, builtIn: false })
      } else {
        setDraft(undefined)
      }
      setMessage('Template saved.')
    },
    onError: (error) => setMessage(error.message),
  })

  const exportLabels = async (
    action: (labels: RenderedLabel[]) => void | Promise<void>,
  ) => {
    setMessage('')
    try {
      const labels = await labelService.renderBatch(inputs)
      await action(labels)
      setMessage(
        `${labels.length} label${labels.length === 1 ? '' : 's'} prepared.`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Label export failed.',
      )
    }
  }

  const loading = plantsLoading || templatesLoading
  return (
    <Page
      title="Label Studio"
      subtitle="Design, preview, and print durable labels for your collection."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-6">
          <Card
            title="1. Choose plants"
            description="Select individual plants, the current filtered view, or the entire collection."
          >
            {loading ? (
              <div className="h-44 animate-pulse rounded-xl bg-surface-muted" />
            ) : (
              <PlantBatchSelector
                plants={plants}
                selected={selected}
                onChange={setSelected}
              />
            )}
          </Card>
          <Card title="2. Design template">
            <label className="mb-5 block text-sm font-semibold">
              Template
              <select
                value={templateId}
                onChange={(event) => {
                  setTemplateId(event.target.value)
                  const next = templates.find(
                    ({ id }) => id === event.target.value,
                  )
                  if (next) setDraft(structuredClone(next))
                }}
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.builtIn ? ' · Built in' : ''}
                  </option>
                ))}
              </select>
            </label>
            {activeTemplate && (
              <TemplateEditor
                template={activeTemplate}
                isDefault={defaultId === activeTemplate.id}
                busy={templateMutation.isPending}
                onChange={setDraft}
                onSave={() => templateMutation.mutate('save')}
                onDuplicate={() => templateMutation.mutate('duplicate')}
                onDelete={() => templateMutation.mutate('delete')}
                onDefault={() => {
                  templateService.setDefault(activeTemplate.id)
                  setDefaultId(activeTemplate.id)
                  setMessage('Default template updated.')
                }}
              />
            )}
          </Card>
        </div>
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card
            title="Live preview"
            description={`${selected.size} plant${selected.size === 1 ? '' : 's'} selected`}
          >
            <LabelPreview label={preview} loading={previewing} />
          </Card>
          <Card
            title="3. Print or download"
            description="Exports use the exact physical dimensions shown in the template."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                disabled={!inputs.length}
                onClick={() =>
                  void exportLabels((labels) => labelService.print(labels))
                }
              >
                <Printer className="size-4" /> Browser print
              </Button>
              <Button
                variant="secondary"
                disabled={!inputs.length}
                onClick={() =>
                  void exportLabels((labels) =>
                    labelService.downloadPdf(labels),
                  )
                }
              >
                <FileText className="size-4" /> Download PDF
              </Button>
              <Button
                variant="secondary"
                disabled={!inputs.length}
                onClick={() =>
                  void exportLabels((labels) =>
                    labelService.downloadPng(labels),
                  )
                }
              >
                <FileImage className="size-4" /> Download PNG
              </Button>
              <Button
                variant="secondary"
                disabled={!inputs.length}
                onClick={() =>
                  void exportLabels((labels) =>
                    labelService.downloadSvg(labels),
                  )
                }
              >
                <Download className="size-4" /> Download SVG
              </Button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              For DYMO and thermal printers, select the matching paper size,
              margins none, and 100% scale. Each selected plant prints on its
              own page.
            </p>
            {message && (
              <p
                role="status"
                className="mt-4 rounded-xl bg-surface-muted p-3 text-sm"
              >
                {message}
              </p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  )
}

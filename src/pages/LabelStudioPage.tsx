import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileImage, FileText, Printer, Tags } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Page } from '../components/ui/Page'
import { LabelPreview } from '../features/labels/LabelPreview'
import { PlantBatchSelector } from '../features/labels/PlantBatchSelector'
import { TemplateEditor } from '../features/labels/TemplateEditor'
import { describeLabelDataError } from '../features/labels/labelDataError'
import { usePlants, useSpaces } from '../hooks/useOrchardData'
import { nfcTagRepository } from '../db/repositories'
import type { LabelTemplateDefinition } from '../models'
import {
  labelService,
  type LabelRenderInput,
  type RenderedLabel,
} from '../services/LabelService'
import {
  builtInLabelTemplates,
  templateService,
} from '../services/TemplateService'

export function LabelStudioPage() {
  const { data: plants = [], isLoading: plantsLoading } = usePlants()
  const { data: spaces = [] } = useSpaces()
  const {
    data: tags = [],
    error: tagsLoadError,
    isError: tagsError,
  } = useQuery({
    queryKey: ['nfc-tags', 'assigned'],
    queryFn: () => nfcTagRepository.listAssigned(),
  })
  const {
    data: customTemplates = [],
    error: templatesLoadError,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery({
    queryKey: ['label-templates'],
    queryFn: () => templateService.listCustom(),
  })
  const templates = useMemo<LabelTemplateDefinition[]>(
    () => [
      ...builtInLabelTemplates,
      ...customTemplates.map((template) => ({ ...template, builtIn: false })),
    ],
    [customTemplates],
  )
  const queryClient = useQueryClient()
  const [templateId, setTemplateId] = useState(templateService.getDefaultId())
  const [draft, setDraft] = useState<LabelTemplateDefinition>()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [exportProgress, setExportProgress] = useState<number>()
  const [exportBusy, setExportBusy] = useState(false)
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
    const tagsByPlant = new Map(
      tags.filter((tag) => tag.resourceId).map((tag) => [tag.resourceId!, tag]),
    )
    return plants
      .filter((plant) => selected.has(plant.id))
      .map((plant) => ({
        plant,
        template: activeTemplate,
        assignedNfcTag: tagsByPlant.get(plant.id),
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
        ? templateService.saveAsCustom({ ...activeTemplate, ...editable })
        : templateService.update(activeTemplate.id, editable)
    },
    onSuccess: async (result, action) => {
      await queryClient.invalidateQueries({ queryKey: ['label-templates'] })
      if (result && typeof result === 'object' && 'id' in result) {
        setTemplateId(result.id)
        setDraft({ ...result, builtIn: false })
      } else {
        setDraft(undefined)
        const fallback = templateService.getDefaultId()
        setDefaultId(fallback)
        setTemplateId(fallback)
      }
      setMessage(
        action === 'delete'
          ? 'Template deleted.'
          : action === 'duplicate'
            ? 'Template duplicated.'
            : 'Template saved.',
      )
      setMessageIsError(false)
    },
    onError: (error) => {
      setMessage(error.message)
      setMessageIsError(true)
    },
  })

  const exportLabels = async (
    action: (labels: RenderedLabel[]) => void | Promise<void>,
  ) => {
    setMessage('')
    setMessageIsError(false)
    setExportProgress(0)
    setExportBusy(true)
    try {
      const labels = await labelService.renderBatch(
        inputs,
        (completed, total) => {
          if (completed === total || completed % 10 === 0)
            setExportProgress(Math.round((completed / total) * 100))
        },
      )
      await action(labels)
      setMessage(
        `${labels.length} label${labels.length === 1 ? '' : 's'} prepared.`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Label export failed.',
      )
      setMessageIsError(true)
    } finally {
      setExportBusy(false)
      setExportProgress(undefined)
    }
  }

  const printLabels = async () => {
    setMessage('')
    setMessageIsError(false)
    setExportProgress(0)
    setExportBusy(true)
    try {
      const labels = await labelService.printInputs(
        inputs,
        (completed, total) => {
          if (completed === total || completed % 10 === 0)
            setExportProgress(Math.round((completed / total) * 100))
        },
      )
      setMessage(
        `${labels.length} label${labels.length === 1 ? '' : 's'} prepared.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Printing failed.')
      setMessageIsError(true)
    } finally {
      setExportBusy(false)
      setExportProgress(undefined)
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
            ) : plants.length === 0 ? (
              <EmptyState
                icon={Tags}
                title="No plants to label"
                description="Add a plant to your collection, then return here to design and print labels."
              />
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
            {templatesError || tagsError ? (
              <div className="space-y-2">
                {templatesError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                  >
                    {describeLabelDataError(templatesLoadError, 'templates')}{' '}
                    Built-in templates remain available.
                  </p>
                )}
                {tagsError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                  >
                    {describeLabelDataError(tagsLoadError, 'nfc-tags')} Labels
                    can still be created without NFC URLs.
                  </p>
                )}
              </div>
            ) : null}
            {activeTemplate ? (
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
                  setMessageIsError(false)
                }}
              />
            ) : !templatesLoading ? (
              <p className="text-sm text-muted-foreground">
                No label templates are available.
              </p>
            ) : null}
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
                disabled={!inputs.length || exportBusy}
                onClick={() => void printLabels()}
              >
                <Printer className="size-4" /> Browser print
              </Button>
              <Button
                variant="secondary"
                disabled={!inputs.length || exportBusy}
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
                disabled={!inputs.length || exportBusy || inputs.length > 100}
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
                disabled={!inputs.length || exportBusy}
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
            {inputs.length > 250 && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Large batch selected. PDF is recommended; generation is
                processed in bounded groups and may take several minutes.
              </p>
            )}
            {inputs.length > 100 && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                PNG is limited to 100 labels per sheet to stay within browser
                canvas limits.
              </p>
            )}
            {exportProgress !== undefined && (
              <div className="mt-4" aria-live="polite">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Preparing labels</span>
                  <span>{exportProgress}%</span>
                </div>
                <progress
                  className="h-2 w-full accent-accent"
                  value={exportProgress}
                  max="100"
                />
              </div>
            )}
            {message && (
              <p
                role={messageIsError ? 'alert' : 'status'}
                className={
                  messageIsError
                    ? 'mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                    : 'mt-4 rounded-xl bg-surface-muted p-3 text-sm'
                }
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

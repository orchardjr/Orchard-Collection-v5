import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LabelRenderInput, RenderedLabel } from './LabelService'
import { LabelService } from './LabelService'
import { builtInLabelTemplates } from './TemplateService'

const save = vi.fn()
const addPage = vi.fn()
const addImage = vi.fn()
vi.mock('jspdf', () => ({
  jsPDF: class {
    save = save
    addPage = addPage
    addImage = addImage
  },
}))

const input: LabelRenderInput = {
  plant: {
    id: 'plant-1',
    nickname: 'Albo',
    scientificName: 'Monstera deliciosa',
    cultivar: 'Albo Variegata',
    kind: 'plant',
    status: 'active',
    favorite: true,
    purchaseDate: new Date('2026-03-04T12:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  template: builtInLabelTemplates[2]!,
  nfcToken: '710a0926-0123-4567-89ab-14ae3cbdf123',
  location: 'Plant room',
}

describe('LabelService', () => {
  const service = new LabelService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders selected fields, QR code, and Code 128 barcode', async () => {
    const label = await service.render(input)
    expect(label.svg).toContain('Albo')
    expect(label.svg).toContain('Monstera deliciosa')
    expect(label.svg).toContain('Plant room')
    expect(label.svg).toContain('viewBox=')
    expect(label.svg).toContain('Code 128 barcode')
  })

  it('renders a batch in input order', async () => {
    const labels = await service.renderBatch([
      input,
      {
        ...input,
        plant: { ...input.plant, id: 'plant-2', nickname: 'Violet' },
      },
    ])
    expect(labels.map(({ plantName }) => plantName)).toEqual(['Albo', 'Violet'])
  })

  it('creates exact-size one-page-per-label print markup', async () => {
    const labels = await service.renderBatch([input, input])
    const write = vi.fn()
    const print = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close: vi.fn() },
      focus: vi.fn(),
      print,
    } as unknown as Window)

    service.print(labels)

    const markup = String(write.mock.calls[0]?.[0])
    expect(markup).toContain('@page{size:4in 2in;margin:0}')
    expect(markup.match(/class="label"/g)).toHaveLength(2)
    expect(print).toHaveBeenCalledOnce()
  })

  it('generates one correctly sized PDF page per batch label', async () => {
    const labels: RenderedLabel[] = [
      await service.render(input),
      await service.render(input),
    ]
    const mutable = service as unknown as {
      rasterize: (svg: string, scale: number) => Promise<string>
    }
    mutable.rasterize = vi.fn().mockResolvedValue('data:image/png;base64,test')

    await service.downloadPdf(labels)

    expect(addPage).toHaveBeenCalledOnce()
    expect(addImage).toHaveBeenCalledTimes(2)
    expect(addImage).toHaveBeenCalledWith(expect.any(String), 'PNG', 0, 0, 4, 2)
    expect(save).toHaveBeenCalledWith('orchard-labels.pdf')
  })
})

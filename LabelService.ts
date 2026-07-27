import JsBarcode from 'jsbarcode'
import type { LabelFieldId, LabelTemplateDefinition, Plant } from '../models'
import { qrService } from './QRService'

export interface LabelRenderInput {
  plant: Plant
  template: LabelTemplateDefinition
  nfcToken?: string
  location?: string
  clone?: string
  accessionId?: string
  collectionId?: string
}

export interface RenderedLabel {
  plantId: string
  plantName: string
  widthIn: number
  heightIn: number
  svg: string
}

const PX_PER_IN = 100
const BATCH_CONCURRENCY = 8
const MAX_RASTER_LABELS = 100

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatDate(value?: Date) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(value)
    : undefined
}

function textValue(field: LabelFieldId, input: LabelRenderInput) {
  const { plant } = input
  const nfcUrl = input.nfcToken ? qrService.url(input.nfcToken) : undefined
  const values: Partial<Record<LabelFieldId, string>> = {
    plantName: plant.nickname || plant.commonName || plant.scientificName,
    scientificName: plant.scientificName,
    cultivar: plant.cultivar,
    clone: input.clone,
    accessionId: input.accessionId,
    collectionId: input.collectionId ?? plant.id,
    publicNfcUrl: nfcUrl,
    acquisitionDate: formatDate(plant.purchaseDate),
    location: input.location,
    notes: plant.notes,
  }
  return values[field]
}

function labelFor(field: LabelFieldId) {
  const labels: Partial<Record<LabelFieldId, string>> = {
    cultivar: 'Cultivar',
    clone: 'Clone',
    accessionId: 'Accession',
    collectionId: 'Collection',
    acquisitionDate: 'Acquired',
    location: 'Location',
    notes: 'Notes',
    publicNfcUrl: 'NFC',
  }
  return labels[field]
}

function truncate(value: string, length: number) {
  const characters = Array.from(value)
  return characters.length > length
    ? `${characters.slice(0, length - 1).join('')}…`
    : value
}

function nestedSvg(svg: string, x: number, y: number, size: number) {
  return svg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<svg[^>]*>/, (root) =>
      root.replace(
        '<svg',
        `<svg x="${x}" y="${y}" width="${size}" height="${size}"`,
      ),
    )
}

function barcodeSvg(value: string, width: number, height: number) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(element, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height,
    width: Math.max(1, width / Math.max(value.length * 8, 1)),
    lineColor: '#000000',
    background: '#ffffff',
  })
  element.setAttribute('width', String(width))
  element.setAttribute('height', String(height))
  element.removeAttribute('x')
  element.removeAttribute('y')
  element.setAttribute('aria-label', `Code 128 barcode for ${value}`)
  return element.outerHTML
}

export class LabelService {
  async render(input: LabelRenderInput): Promise<RenderedLabel> {
    const { plant, template } = input
    const width = template.widthIn * PX_PER_IN
    const height = template.heightIn * PX_PER_IN
    const padding = Math.max(8, Math.min(width, height) * 0.07)
    const hasQr = template.fields.includes('qrCode') && input.nfcToken
    const qrSize = hasQr
      ? Math.min(template.qrSizeIn * PX_PER_IN, height - padding * 2)
      : 0
    const contentWidth = width - padding * 2 - (qrSize ? qrSize + padding : 0)
    const fontSize = Math.max(8, 12 * template.fontScale)
    const titleSize = Math.max(fontSize + 2, 18 * template.fontScale)
    const lineHeight = fontSize * 1.28
    const barcodeHeight = template.fields.includes('barcode')
      ? Math.min(template.barcodeHeightIn * PX_PER_IN, height * 0.25)
      : 0
    const textBottom =
      height - padding - (barcodeHeight ? barcodeHeight + 5 : 0)
    let y = padding + titleSize
    const content: string[] = []

    for (const field of template.fields) {
      if (field === 'qrCode' || field === 'barcode' || field === 'customFields')
        continue
      const value = textValue(field, input)
      if (!value || y > textBottom) continue
      const isTitle = field === 'plantName'
      const isScientific = field === 'scientificName'
      const prefix = labelFor(field)
      const line = prefix ? `${prefix}: ${value}` : value
      const maxLength = Math.max(
        10,
        Math.floor(
          contentWidth / (isTitle ? titleSize * 0.52 : fontSize * 0.5),
        ),
      )
      content.push(
        `<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="${isTitle ? titleSize : fontSize}" font-weight="${isTitle ? 700 : 500}"${isScientific ? ' font-style="italic"' : ''}>${escapeXml(truncate(line, maxLength))}</text>`,
      )
      y += isTitle ? titleSize * 1.12 : lineHeight
    }

    if (template.fields.includes('customFields')) {
      for (const field of template.customFields) {
        if (y > textBottom) break
        const line = field.label
          ? `${field.label}: ${field.value}`
          : field.value
        content.push(
          `<text x="${padding}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="500">${escapeXml(truncate(line, Math.max(10, Math.floor(contentWidth / (fontSize * 0.5)))))}</text>`,
        )
        y += lineHeight
      }
    }

    if (hasQr && input.nfcToken) {
      const qr = await qrService.toSvg(input.nfcToken)
      content.push(nestedSvg(qr, width - padding - qrSize, padding, qrSize))
    } else if (template.fields.includes('qrCode')) {
      content.push(
        `<text x="${width - padding}" y="${height / 2}" text-anchor="end" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#555">NFC not assigned</text>`,
      )
    }

    if (barcodeHeight) {
      const barcodeValue = input.accessionId ?? input.collectionId ?? plant.id
      const barcode = barcodeSvg(barcodeValue, contentWidth, barcodeHeight)
      content.push(
        barcode.replace(
          '<svg ',
          `<svg x="${padding}" y="${height - padding - barcodeHeight}" `,
        ),
      )
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${template.widthIn}in" height="${template.heightIn}in" viewBox="0 0 ${width} ${height}" role="img" aria-label="Label for ${escapeXml(plant.nickname)}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${content.join('')}</g></svg>`
    return {
      plantId: plant.id,
      plantName: plant.nickname,
      widthIn: template.widthIn,
      heightIn: template.heightIn,
      svg,
    }
  }

  async renderBatch(
    inputs: LabelRenderInput[],
    onProgress?: (completed: number, total: number) => void,
  ) {
    const labels = new Array<RenderedLabel>(inputs.length)
    let nextIndex = 0
    let completed = 0
    const worker = async () => {
      while (nextIndex < inputs.length) {
        const index = nextIndex++
        labels[index] = await this.render(inputs[index]!)
        completed += 1
        onProgress?.(completed, inputs.length)
        if (completed % 25 === 0)
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(BATCH_CONCURRENCY, inputs.length) },
        worker,
      ),
    )
    return labels
  }

  print(labels: RenderedLabel[]) {
    const printWindow = this.openPrintWindow()
    this.writePrintDocument(printWindow, labels)
  }

  async printInputs(
    inputs: LabelRenderInput[],
    onProgress?: (completed: number, total: number) => void,
  ) {
    const printWindow = this.openPrintWindow()
    printWindow.document.write(
      '<!doctype html><title>Preparing Orchard labels</title><p style="font:16px system-ui;padding:24px">Preparing labels…</p>',
    )
    try {
      const labels = await this.renderBatch(inputs, onProgress)
      printWindow.document.open()
      this.writePrintDocument(printWindow, labels)
      return labels
    } catch (error) {
      printWindow.close()
      throw error
    }
  }

  private openPrintWindow() {
    // The new window must remain script-accessible so this service can write the
    // isolated print document. It contains only generated, XML-escaped content.
    const printWindow = window.open('', '_blank')
    if (!printWindow)
      throw new Error('Allow pop-ups to open the label print preview.')
    return printWindow
  }

  private writePrintDocument(printWindow: Window, labels: RenderedLabel[]) {
    if (!labels.length) throw new Error('Select at least one label to print.')
    const first = labels[0]!
    if (
      labels.some(
        (label) =>
          label.widthIn !== first.widthIn || label.heightIn !== first.heightIn,
      )
    )
      throw new Error('A print batch must use one label size.')
    printWindow.document.write(
      `<!doctype html><html><head><title>Orchard labels</title><style>@page{size:${first.widthIn}in ${first.heightIn}in;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}.label{width:${first.widthIn}in;height:${first.heightIn}in;overflow:hidden;break-after:page;page-break-after:always}.label:last-child{break-after:avoid;page-break-after:avoid}.label svg{display:block;width:100%;height:100%}</style></head><body>${labels.map((label) => `<div class="label">${label.svg}</div>`).join('')}</body></html>`,
    )
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  async downloadSvg(labels: RenderedLabel[], filename = 'orchard-labels.svg') {
    this.download(
      this.compositeSvg(labels),
      'image/svg+xml;charset=utf-8',
      filename,
    )
  }

  async downloadPng(labels: RenderedLabel[], filename = 'orchard-labels.png') {
    if (labels.length > MAX_RASTER_LABELS)
      throw new Error(
        `PNG sheets support up to ${MAX_RASTER_LABELS} labels. Use PDF for this batch.`,
      )
    const dataUrl = await this.rasterize(this.compositeSvg(labels), 3)
    this.downloadDataUrl(dataUrl, filename)
  }

  async downloadPdf(labels: RenderedLabel[], filename = 'orchard-labels.pdf') {
    if (!labels.length) throw new Error('Select at least one label to export.')
    const first = labels[0]!
    const orientation =
      first.widthIn >= first.heightIn ? 'landscape' : 'portrait'
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({
      unit: 'in',
      format: [first.widthIn, first.heightIn],
      orientation,
    })
    for (const [index, label] of labels.entries()) {
      if (index)
        pdf.addPage(
          [label.widthIn, label.heightIn],
          label.widthIn >= label.heightIn ? 'landscape' : 'portrait',
        )
      const dataUrl = await this.rasterize(label.svg, 3)
      pdf.addImage(dataUrl, 'PNG', 0, 0, label.widthIn, label.heightIn)
    }
    pdf.save(filename)
  }

  private compositeSvg(labels: RenderedLabel[]) {
    if (!labels.length) throw new Error('Select at least one label to export.')
    const width = Math.max(...labels.map((label) => label.widthIn)) * PX_PER_IN
    const heights = labels.map((label) => label.heightIn * PX_PER_IN)
    const totalHeight = heights.reduce((sum, height) => sum + height, 0)
    let offset = 0
    const content = labels.map((label, index) => {
      const nested = label.svg.replace(
        '<svg ',
        `<svg x="0" y="${offset}" width="${label.widthIn * PX_PER_IN}" height="${heights[index]}" `,
      )
      offset += heights[index]!
      return nested
    })
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">${content.join('')}</svg>`
  }

  private rasterize(svg: string, scale: number) {
    return new Promise<string>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width * scale
        canvas.height = image.height * scale
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Canvas rendering is unavailable.'))
          return
        }
        context.scale(scale, scale)
        context.drawImage(image, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      image.onerror = () =>
        reject(new Error('The label image could not render.'))
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
  }

  private download(content: string, type: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  private downloadDataUrl(dataUrl: string, filename: string) {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    link.click()
  }
}

export const labelService = new LabelService()

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { Plant, Space } from '../models'
import type { CollectionAuditStatus } from '../features/plants/collectionPrint'
import {
  labelEntries,
  labelLines,
  labelPosition,
  letterLabelLayout,
  plantLabelQrUrl,
  type PlantLabelOptions,
} from '../features/labels/plantLabelSheets'

export interface LabelFontData {
  normal: string
  bold: string
}
export interface SheetText {
  text: string
  x: number
  y: number
  size: number
  bold: boolean
}
export interface SheetLabel {
  plantId: string
  x: number
  y: number
  width: number
  height: number
  text: SheetText[]
  qr?: {
    url: string
    x: number
    y: number
    size: number
    modules: number
    dark: { x: number; y: number }[]
  }
}
export interface PlantLabelDocument {
  pdf: jsPDF
  sheets: SheetLabel[][]
  borders: boolean
}
let fontPromise: Promise<LabelFontData> | undefined
export function loadPlantLabelFonts() {
  fontPromise ??= Promise.all(
    ['Vera.ttf', 'VeraBd.ttf'].map(async (file) => {
      const response = await fetch('/fonts/' + file)
      if (!response.ok)
        throw new Error('Label fonts could not be loaded. Please retry.')
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      return btoa(binary)
    }),
  )
    .then(([normal, bold]) => ({ normal: normal!, bold: bold! }))
    .catch((error) => {
      fontPromise = undefined
      throw error
    })
  return fontPromise
}
export function fitLabelText(pdf: jsPDF, text: string, width: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (pdf.getTextWidth(clean) <= width) return clean
  const chars = Array.from(clean)
  let low = 0,
    high = chars.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (pdf.getTextWidth(chars.slice(0, mid).join('') + '...') <= width)
      low = mid
    else high = mid - 1
  }
  return chars.slice(0, low).join('') + '...'
}
export async function createPlantLabelPdf(
  plants: Plant[],
  spaces: Space[],
  audit: ReadonlyMap<string, CollectionAuditStatus>,
  options: PlantLabelOptions,
  fonts?: LabelFontData,
): Promise<PlantLabelDocument> {
  const entries = labelEntries(plants, options.copies)
  if (!entries.length) throw new Error('Choose at least one plant.')
  if (!options.fields.size && !options.qr)
    throw new Error('Choose at least one label field or QR code.')
  const font = fonts ?? (await loadPlantLabelFonts())
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
    compress: true,
    putOnlyUsedFonts: true,
  })
  pdf.addFileToVFS('Vera.ttf', font.normal)
  pdf.addFont('Vera.ttf', 'OrchardLabel', 'normal')
  pdf.addFileToVFS('VeraBd.ttf', font.bold)
  pdf.addFont('VeraBd.ttf', 'OrchardLabel', 'bold')
  pdf.setProperties({ title: 'Orchard Plant Label Sheets' })
  pdf.viewerPreferences({ PrintScaling: 'None' })
  const locations = new Map(spaces.map((space) => [space.id, space.name]))
  const sheets: SheetLabel[][] = []
  const rendered = new Map<
    string,
    Omit<SheetLabel, 'x' | 'y' | 'width' | 'height'>
  >()
  for (const [index, plant] of entries.entries()) {
    const position = labelPosition(index)
    if (!sheets[position.page]) {
      sheets[position.page] = []
      if (position.page) pdf.addPage('letter', 'portrait')
    }
    let content = rendered.get(plant.id)
    if (!content) {
      const url = options.qr
        ? plantLabelQrUrl(plant, options.localOnly)
        : undefined
      const lines = labelLines(
        plant,
        locations,
        audit.get(plant.id),
        options.fields,
      )
      if (!lines.length && !url)
        throw new Error(
          'A selected plant has no content for these fields. Include Plant/display name or Plant ID.',
        )
      const titleHeight = lines.length >= 4 ? 9 : 12
      const bodyHeight = lines.length >= 4 ? 6 : 9
      const heights = lines.map((line) =>
        line.bold ? titleHeight : bodyHeight,
      )
      let y = (36 - heights.reduce((sum, height) => sum + height, 0)) / 2
      const text = lines.map((line, i) => {
        const size = line.bold
          ? lines.length >= 4
            ? 9
            : 11
          : lines.length >= 4
            ? 6
            : 8
        pdf
          .setFont('OrchardLabel', line.bold ? 'bold' : 'normal')
          .setFontSize(size)
        const item = {
          text: fitLabelText(pdf, line.text, url ? 137 : 172),
          x: 4,
          y: y + heights[i]! * 0.8,
          size,
          bold: line.bold,
        }
        y += heights[i]!
        return item
      })
      content = { plantId: plant.id, text }
      if (url) {
        const code = QRCode.create(url, { errorCorrectionLevel: 'M' })
        const dark: { x: number; y: number }[] = []
        for (let y = 0; y < code.modules.size; y++)
          for (let x = 0; x < code.modules.size; x++)
            if (code.modules.get(y, x)) dark.push({ x: x + 4, y: y + 4 })
        content.qr = {
          url,
          x: 144,
          y: 2,
          size: 32,
          modules: code.modules.size + 8,
          dark,
        }
      }
      rendered.set(plant.id, content)
    }
    const label = { ...position, ...content }
    sheets[position.page]!.push(label)
    pdf.setDrawColor('#000000').setFillColor('#000000').setLineWidth(0.25)
    if (options.borders)
      pdf.rect(position.x + 0.125, position.y + 0.125, 179.75, 35.75)
    for (const line of content.text) {
      pdf
        .setFont('OrchardLabel', line.bold ? 'bold' : 'normal')
        .setFontSize(line.size)
        .setTextColor(0)
      pdf.text(line.text, position.x + line.x, position.y + line.y)
    }
    if (content.qr) {
      const qr = content.qr,
        moduleSize = qr.size / qr.modules
      for (const cell of qr.dark)
        pdf.rect(
          position.x + qr.x + cell.x * moduleSize,
          position.y + qr.y + cell.y * moduleSize,
          moduleSize,
          moduleSize,
          'F',
        )
    }
    if (index % letterLabelLayout.perPage === letterLabelLayout.perPage - 1)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  return { pdf, sheets, borders: options.borders }
}

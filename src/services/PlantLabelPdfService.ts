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
export const minimumLabelFontSize = 6
const lineSpacing = 1.1
export function fitLabelText(
  pdf: jsPDF,
  text: string,
  width: number,
  defaultSize: number,
) {
  const clean = text.replace(/\s+/g, ' ').trim()
  pdf.setFontSize(defaultSize)
  const singleSize = Math.min(
    defaultSize,
    (defaultSize * width) / (pdf.getTextWidth(clean) || 1),
  )
  if (singleSize >= minimumLabelFontSize)
    return { lines: [clean], size: singleSize }

  // Prefer a balanced word boundary; split an unbroken identifier only when
  // necessary. Both halves retain every character, never an ellipsis.
  pdf.setFontSize(minimumLabelFontSize)
  const chars = Array.from(clean)
  for (const wordsOnly of [true, false]) {
    let best: { lines: string[]; measured: number } | undefined
    for (let i = 1; i < chars.length; i++) {
      if (wordsOnly && chars[i] !== ' ') continue
      const lines = [
        chars.slice(0, i).join('').trimEnd(),
        chars.slice(i).join('').trimStart(),
      ]
      const measured = Math.max(...lines.map((line) => pdf.getTextWidth(line)))
      if (measured <= width && (!best || measured < best.measured))
        best = { lines, measured }
    }
    if (best)
      return {
        lines: best.lines,
        size: Math.min(
          defaultSize,
          (minimumLabelFontSize * width) / best.measured,
        ),
      }
  }
  throw new Error(
    'The full text cannot fit in two lines at a readable 6-point size. Turn off QR or choose fewer label fields. No text has been cut off.',
  )
}

function layoutLabelText(
  pdf: jsPDF,
  lines: { text: string; bold: boolean }[],
  width: number,
): SheetText[] {
  const fitted = lines.map((line) => {
    const defaultSize = line.bold
      ? lines.length >= 4
        ? 9
        : 11
      : lines.length >= 4
        ? 6
        : 8
    pdf.setFont('OrchardLabel', line.bold ? 'bold' : 'normal')
    return {
      ...fitLabelText(pdf, line.text, width, defaultSize),
      bold: line.bold,
    }
  })
  // Reserve vertical space for EVERY enabled field, not just the title.
  // 1pt top/bottom padding also keeps glyphs clear of the inset cutting guide.
  const availableHeight = letterLabelLayout.height - 2
  const heightAt = (factor: number) =>
    fitted.reduce(
      (sum, item) =>
        sum +
        item.lines.length *
          lineSpacing *
          (minimumLabelFontSize + (item.size - minimumLabelFontSize) * factor),
      0,
    )
  if (heightAt(0) > availableHeight)
    throw new Error(
      'The full text and selected fields cannot fit within this label at a readable 6-point size. Choose fewer fields or turn off QR. No text has been cut off.',
    )
  let low = 0,
    high = 1
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2
    if (heightAt(mid) <= availableHeight) low = mid
    else high = mid
  }
  const factor = heightAt(1) <= availableHeight ? 1 : low
  let y = (letterLabelLayout.height - heightAt(factor)) / 2
  return fitted.flatMap((item) => {
    const size =
      minimumLabelFontSize + (item.size - minimumLabelFontSize) * factor
    return item.lines.map((text) => {
      const line = { text, x: 4, y: y + size * 0.85, size, bold: item.bold }
      y += size * lineSpacing
      return line
    })
  })
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
      const text = layoutLabelText(pdf, lines, url ? 137 : 172)
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

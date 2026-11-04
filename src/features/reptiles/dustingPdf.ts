import { jsPDF } from 'jspdf'
import {
  loadPlantLabelFonts,
  type LabelFontData,
} from '../../services/PlantLabelPdfService'
import type { DustingCalendar, DustingEntry } from './dustingCalendar'
export const dustingText = (e: DustingEntry) =>
  `${e.animal}: ${e.product} | D3: ${e.d3}${e.overlap ? ' - POSSIBLE D3 OVERLAP' : ''} | ${e.state}`
export async function dustingPdf(
  calendar: DustingCalendar,
  fonts?: LabelFontData,
) {
  const font = fonts ?? (await loadPlantLabelFonts())
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter',
  })
  pdf.addFileToVFS('Vera.ttf', font.normal)
  pdf.addFont('Vera.ttf', 'Vera', 'normal')
  pdf.addFileToVFS('VeraBd.ttf', font.bold)
  pdf.addFont('VeraBd.ttf', 'Vera', 'bold')
  const heading = () => {
    pdf.setFont('Vera', 'bold')
    pdf.setFontSize(17)
    pdf.text(
      `Orchard Collection - Dusting Calendar | ${calendar.month}`,
      30,
      32,
    )
    pdf.setFont('Vera', 'normal')
    pdf.setFontSize(9)
    pdf.text(
      `${calendar.animalCount} reptiles | Planned dates are estimates; late completion may shift future doses.`,
      30,
      49,
    )
  }
  heading()
  const first = new Date(calendar.month + '-01T12:00:00Z')
  const days = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate()
  const rows = Math.ceil((first.getUTCDay() + days) / 7)
  const width = 732 / 7,
    height = 438 / rows
  const overflow: Array<{ day: string; entries: DustingEntry[] }> = []
  pdf.setFontSize(9)
  ;[
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ].forEach((name, i) => pdf.text(name, 34 + i * width, 72))
  for (let day = 1; day <= days; day++) {
    const index = first.getUTCDay() + day - 1,
      x = 30 + (index % 7) * width,
      y = 80 + Math.floor(index / 7) * height
    pdf.setDrawColor(170)
    pdf.setLineWidth(0.4)
    pdf.rect(x, y, width, height)
    pdf.setFont('Vera', 'bold')
    pdf.setFontSize(9)
    pdf.text(String(day), x + 5, y + 12)
    pdf.setFont('Vera', 'normal')
    pdf.setFontSize(7)
    const key = `${calendar.month}-${String(day).padStart(2, '0')}`
    const entries = calendar.entries.filter((e) => e.day === key)
    let cursor = y + 24,
      spilled = false
    for (const entry of entries) {
      const lines = pdf.splitTextToSize(
        dustingText(entry),
        width - 20,
      ) as string[]
      if (cursor + lines.length * 9 > y + height - 15) {
        spilled = true
        break
      }
      pdf.rect(x + 5, cursor - 5, 5, 5)
      pdf.text(lines, x + 14, cursor, { lineHeightFactor: 9 / 7 })
      cursor += lines.length * 9 + 5
    }
    if (spilled) {
      overflow.push({ day: key, entries })
      pdf.setFont('Vera', 'bold')
      pdf.text('Full day on detail pages', x + 5, y + height - 6)
    }
  }
  pdf.setFont('Vera', 'normal')
  pdf.setFontSize(8)
  pdf.text(
    'Check boxes are for paper tracking only. Printing does not record doses in the app.',
    30,
    538,
  )
  pdf.text(
    `Dates use each routine's timezone. ${calendar.reminders.length ? 'Every-feeding reminders follow on detail pages.' : ''}`,
    30,
    550,
  )
  let y = 100
  const newDetail = () => {
    pdf.addPage()
    heading()
    y = 80
  }
  if (overflow.length || calendar.reminders.length) newDetail()
  const block = (text: string, checkbox = false) => {
    pdf.setFont('Vera', 'normal')
    pdf.setFontSize(10)
    const lines = pdf.splitTextToSize(text, 710) as string[]
    if (y + lines.length * 14 > 555 && lines.length * 14 < 475) newDetail()
    if (checkbox) pdf.rect(30, y - 7, 7, 7)
    for (const line of lines) {
      if (y > 555) newDetail()
      pdf.setFont('Vera', 'normal')
      pdf.setFontSize(10)
      pdf.text(line, checkbox ? 44 : 30, y)
      y += 14
    }
    y += 8
  }
  for (const group of overflow) {
    block(`Daily detail - ${group.day} (all entries for this date)`)
    for (const entry of group.entries)
      block(`${group.day} | ${dustingText(entry)}`, true)
  }
  if (calendar.reminders.length) {
    block('Every-feeding reminders - dates not predicted')
    for (const reminder of calendar.reminders) block(reminder)
  }
  for (let p = 1; p <= pdf.getNumberOfPages(); p++) {
    pdf.setPage(p)
    pdf.setFontSize(8)
    pdf.text(`Page ${p} of ${pdf.getNumberOfPages()}`, 710, 588)
  }
  return pdf
}

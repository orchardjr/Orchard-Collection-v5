import { jsPDF } from 'jspdf'
import type { ReptileData } from './types'
import { weightHistory } from './calculations'
import {
  loadPlantLabelFonts,
  type LabelFontData,
} from '../../services/PlantLabelPdfService'
export const reportSections = [
  'Profile',
  'Weight',
  'Feeding',
  'Supplement schedules',
  'Supplement history',
  'Husbandry',
  'Health',
] as const
export async function careReport(
  data: ReptileData,
  ids: string[],
  sections: readonly string[],
  fonts?: LabelFontData,
) {
  const font = fonts ?? (await loadPlantLabelFonts())
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
  pdf.addFileToVFS('Vera.ttf', font.normal)
  pdf.addFont('Vera.ttf', 'Vera', 'normal')
  pdf.addFileToVFS('VeraBd.ttf', font.bold)
  pdf.addFont('VeraBd.ttf', 'Vera', 'bold')
  pdf.setFont('Vera')
  pdf.setFontSize(10)
  let y = 45
  const line = (text: string, size = 10) => {
    pdf.setFont('Vera', size > 10 ? 'bold' : 'normal')
    pdf.setFontSize(size)
    const lines = pdf.splitTextToSize(text, 522) as string[]
    const blockHeight = lines.length * (size + 5) + (size > 10 ? 30 : 0)
    if (blockHeight < 697 && y + blockHeight > 742) {
      pdf.addPage()
      y = 45
    }
    for (const row of lines) {
      if (y > 742) {
        pdf.addPage()
        y = 45
      }
      pdf.text(row, 45, y)
      y += size + 5
    }
  }
  line('Orchard Collection - Reptile Care Report', 17)
  line(
    `Generated ${new Date().toLocaleString()} | ${ids.length} selected reptiles`,
  )
  const details = (value: Record<string, unknown>) =>
    Object.entries(value)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(
        ([k, v]) =>
          `${k}: ${
            Array.isArray(v)
              ? v
                  .map((item) =>
                    typeof item === 'object'
                      ? Object.entries(item)
                          .map(([key, val]) => `${key}: ${val}`)
                          .join(', ')
                      : String(item),
                  )
                  .join('; ')
              : String(v)
          }`,
      )
      .join(' | ')
  for (const animal of data.reptiles.filter((a) => ids.includes(a.id))) {
    y += 10
    line(`${animal.name} - ${animal.species}`, 14)
    const events = data.events
      .filter((e) => e.reptileId === animal.id)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    if (sections.includes('Profile')) {
      line(`Sex: ${animal.sex} | Status: ${animal.status}`)
      line(details(animal.identification))
    }
    if (sections.includes('Weight')) {
      line('Weight history (grams)', 12)
      const weights = weightHistory(events)
      for (const row of weights)
        line(
          `${row.event.occurredAt.toLocaleString()} | ${Number(row.grams.toFixed(6))} g | Change: ${row.change?.toFixed(2) ?? '-'} g (${row.percent?.toFixed(1) ?? '-'}%) | ${row.event.notes}`,
        )
      if (weights.length) {
        if (y + 150 > 742) {
          pdf.addPage()
          y = 45
        }
        const max = Math.max(...weights.map((r) => r.grams), 1)
        const first = weights[0]!.event.occurredAt.getTime(),
          last = weights.at(-1)!.event.occurredAt.getTime()
        const pts = weights.map((r) => ({
          x:
            70 +
            ((r.event.occurredAt.getTime() - first) /
              Math.max(1, last - first)) *
              470,
          y: y + 100 - (r.grams / max) * 90,
        }))
        pdf.line(70, y + 100, 540, y + 100)
        pdf.setFontSize(9)
        pdf.text(`${max.toFixed(1)} g`, 45, y + 10)
        pdf.text('0 g', 45, y + 100)
        for (let i = 1; i < pts.length; i++)
          pdf.line(pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y)
        for (const p of pts) pdf.circle(p.x, p.y, 2, 'F')
        pdf.text(weights[0]!.event.occurredAt.toLocaleDateString(), 70, y + 115)
        pdf.text(
          weights.at(-1)!.event.occurredAt.toLocaleDateString(),
          460,
          y + 115,
        )
        y += 140
      }
    }
    if (sections.includes('Supplement schedules')) {
      line('User-defined supplement schedules', 12)
      for (const r of data.routines.filter(
        (r) => r.reptileId === animal.id && r.type === 'supplement',
      )) {
        const product = data.supplements.find((s) => s.id === r.supplementId)
        line(
          `${r.title}: ${product?.name ?? 'Unknown'} (${product?.brand ?? ''}, D3 ${product?.d3 ?? 'unknown'}) | ${r.frequency}, interval ${r.intervalCount} | weekdays ${r.weekdays.join(',')} | custom dates ${r.customDates.join(',')} | first due ${r.startsAt} | ${r.timezone} | enabled ${r.enabled}`,
        )
      }
    }
    if (sections.includes('Husbandry')) {
      line('Husbandry setup', 12)
      line(details(animal.husbandry))
    }
    for (const [section, kind] of [
      ['Feeding', 'feeding'],
      ['Supplement history', 'supplement'],
      ['Husbandry', 'husbandry'],
      ['Health', 'health'],
    ])
      if (sections.includes(section!)) {
        line(section!, 12)
        for (const event of events.filter((e) => e.kind === kind)) {
          line(
            `${event.occurredAt.toLocaleString()} | ${details(event.payload)}`,
          )
          if (event.notes) line(event.notes)
        }
      }
  }
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(9)
    pdf.text(`Page ${i} of ${pages}`, 500, 770)
  }
  return pdf
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

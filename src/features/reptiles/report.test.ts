// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { careReport, reportSections } from './report'
import type { ReptileData } from './types'
const now = new Date('2026-10-01T12:00:00Z')
const base = { createdAt: now, updatedAt: now }
const data: ReptileData = {
  reptiles: [
    {
      ...base,
      id: 'r',
      name: 'Écho',
      species: 'Furcifer pardalis',
      sex: 'female',
      status: 'active',
      identification: {
        morph: 'Ambilobe',
        source: 'Breeder',
        birthDate: '2026-01-01',
      },
      husbandry: {
        enclosure: 'Screen enclosure',
        unit: 'C',
        lighting: 'User-entered UVB equipment',
      },
      attention: false,
      deleting: false,
    },
  ],
  events: Array.from({ length: 55 }, (_, i) => ({
    ...base,
    id: String(i),
    reptileId: 'r',
    kind: 'weight' as const,
    occurredAt: new Date(now.getTime() + i * 86400000),
    payload: { grams: 6.8 + i / 10 },
    notes:
      'Routine measurement. No health conclusion is implied by the change.',
  })),
  routines: [],
  supplements: [],
  tasks: [],
  media: [],
}
const fonts = {
  normal: readFileSync('public/fonts/Vera.ttf').toString('base64'),
  bold: readFileSync('public/fonts/VeraBd.ttf').toString('base64'),
}
it('produces a multi-page Letter report with vector text, chart and selected sections', async () => {
  const pdf = await careReport(data, ['r'], reportSections, fonts)
  expect(pdf.getNumberOfPages()).toBeGreaterThan(1)
  expect(pdf.internal.pageSize.getWidth()).toBe(612)
  expect(pdf.internal.pageSize.getHeight()).toBe(792)
  const output = pdf.output()
  expect(output).toContain('/Font')
  writeFileSync(
    '/private/tmp/orchard-reptile-report-qa.pdf',
    Buffer.from(pdf.output('arraybuffer')),
  )
})
it('omits unselected reptiles and sections', async () => {
  const pdf = await careReport(data, [], ['Profile'], fonts)
  expect(pdf.getNumberOfPages()).toBe(1)
})

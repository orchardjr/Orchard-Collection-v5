// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import jsQR from 'jsqr'
import type { Plant } from '../models'
import {
  createPlantLabelPdf,
  minimumLabelFontSize,
} from './PlantLabelPdfService'
import {
  labelFields,
  letterLabelLayout,
  type PlantLabelOptions,
} from '../features/labels/plantLabelSheets'

const fonts = {
  normal: readFileSync('public/fonts/Vera.ttf').toString('base64'),
  bold: readFileSync('public/fonts/VeraBd.ttf').toString('base64'),
}
const now = new Date('2026-01-01')
const plant = (id: string, nickname = id): Plant => ({
  id,
  nickname,
  scientificName: 'Cattleya trianae',
  cultivar: 'Alba',
  kind: 'plant',
  status: 'active',
  favorite: false,
  createdAt: now,
  updatedAt: now,
})
const options: PlantLabelOptions = {
  fields: new Set(['name', 'botanical', 'cultivar']),
  copies: 1,
  borders: true,
  qr: false,
}
describe('Letter plant label PDF', () => {
  it.each([false, true])(
    'preserves complete real-world names and secondary text with QR=%s',
    async (qr) => {
      const names = [
        'Alocasia Ninja Mint Variegated',
        'Anthurium Pterodactyl Variegated',
        "Begonia 'Rouge' Variegated Silver Form",
        "Anthurium crystallinum × magnificum 'Dark Form Silver Veins'",
      ]
      const plants = names.map((name, i) => ({
        ...plant(`55ad561b-99b2-41f3-ac0f-844e2ca23eb${i}`, name),
        scientificName:
          "Philodendron erubescens 'Pink Princess Marble Variegata'",
        cultivar: undefined,
      }))
      const result = await createPlantLabelPdf(
        plants,
        [],
        new Map(),
        { ...options, qr },
        fonts,
      )
      for (const [i, label] of result.sheets[0]!.entries()) {
        expect(
          label.text
            .filter((line) => line.bold)
            .map((line) => line.text)
            .join(' '),
        ).toBe(names[i])
        expect(
          label.text
            .filter((line) => !line.bold)
            .map((line) => line.text)
            .join(' '),
        ).toBe(plants[i]!.scientificName)
        expect([label.width, label.height]).toEqual([180, 36])
        for (const line of label.text) {
          expect(line.text).not.toMatch(/\.\.\.|…/)
          expect(line.size).toBeGreaterThanOrEqual(minimumLabelFontSize)
          result.pdf
            .setFont('OrchardLabel', line.bold ? 'bold' : 'normal')
            .setFontSize(line.size)
          expect(result.pdf.getTextWidth(line.text)).toBeLessThanOrEqual(
            (qr ? 137 : 172) + 1e-8,
          )
          expect(line.y - line.size * 0.85).toBeGreaterThanOrEqual(1 - 1e-8)
          expect(line.y + line.size * 0.25).toBeLessThanOrEqual(35 + 1e-8)
        }
        for (let j = 1; j < label.text.length; j++) {
          const previous = label.text[j - 1]!,
            current = label.text[j]!
          expect(current.y - current.size * 0.85).toBeGreaterThanOrEqual(
            previous.y + previous.size * 0.25 - 1e-8,
          )
        }
      }
      expect(
        result.sheets[0]![3]!.text.filter((line) => line.bold),
      ).toHaveLength(2)
      expect(result.sheets[0]![0]!.text[0]!.size).toBeLessThan(11)
      expect(result.pdf.getNumberOfPages()).toBe(1)
    },
  )
  it('keeps short names at normal sizes and uses the extra width without QR', async () => {
    const id = '55ad561b-99b2-41f3-ac0f-844e2ca23eb5'
    const short = await createPlantLabelPdf(
      [plant(id, 'Aloe')],
      [],
      new Map(),
      options,
      fonts,
    )
    expect(short.sheets[0]![0]!.text.map((line) => line.size)).toEqual([11, 8])
    const p = plant(id, 'Alocasia Ninja Mint Variegated')
    const plain = await createPlantLabelPdf([p], [], new Map(), options, fonts)
    const qr = await createPlantLabelPdf(
      [p],
      [],
      new Map(),
      { ...options, qr: true },
      fonts,
    )
    expect(plain.sheets[0]![0]!.text[0]!.size).toBeGreaterThan(
      qr.sheets[0]![0]!.text[0]!.size,
    )
  })
  it('wraps unbroken names without discarding characters', async () => {
    const name =
      'AnthuriumCrystallinumMagnificumDarkFormSilverVeinsSelectedSeedling'
    const result = await createPlantLabelPdf(
      [plant('a', name)],
      [],
      new Map(),
      { ...options, fields: new Set(['name']) },
      fonts,
    )
    const text = result.sheets[0]![0]!.text
    expect(text).toHaveLength(2)
    expect(text.map((line) => line.text).join('')).toBe(name)
  })
  it('refuses impossible text or overfull fields instead of truncating or shrinking below the readable minimum', async () => {
    await expect(
      createPlantLabelPdf(
        [plant('a', 'Extremely long cultivar '.repeat(30))],
        [],
        new Map(),
        options,
        fonts,
      ),
    ).rejects.toThrow('two lines')
    const p = {
      ...plant(
        'id',
        "Anthurium crystallinum × magnificum 'Dark Form Silver Veins Selected Seedling'",
      ),
      spaceId: 's',
    }
    await expect(
      createPlantLabelPdf(
        [p],
        [{ id: 's', name: 'Greenhouse' } as never],
        new Map([[p.id, { nfcAssigned: true, nfcCode: '123', photoCount: 0 }]]),
        { ...options, fields: new Set(labelFields.map((field) => field.id)) },
        fonts,
      ),
    ).rejects.toThrow('selected fields cannot fit')
  })
  it('places multiple 2.5 by 0.5 inch labels on the SAME Letter PDF page', async () => {
    const result = await createPlantLabelPdf(
      [plant('a'), plant('b'), plant('c')],
      [],
      new Map(),
      options,
      fonts,
    )
    expect(result.pdf.getNumberOfPages()).toBe(1)
    expect(result.sheets).toHaveLength(1)
    expect(result.sheets[0]).toHaveLength(3)
    expect(
      result.sheets[0]!.map((p) => [p.x, p.y, p.width / 72, p.height / 72]),
    ).toEqual([
      [27, 36, 2.5, 0.5],
      [216, 36, 2.5, 0.5],
      [405, 36, 2.5, 0.5],
    ])
    // Real PDF drawing stream: border centerline inset by half its 0.25pt
    // stroke, so the outside edges remain exactly 180pt x 36pt.
    const stream = (
      result.pdf.internal.pages as unknown as string[][]
    )[1]!.join('\n')
    expect(stream.match(/179\.75 -35\.75 re/g)).toHaveLength(3)
    expect(result.pdf.output()).toMatch(/\/MediaBox \[0 0 612\.? 792\.?\]/)
    expect(result.pdf.output()).toContain('/PrintScaling /None')
  })
  it('calculates capacity and paginates without resizing later labels', async () => {
    expect(letterLabelLayout.columns).toBe(3)
    expect(letterLabelLayout.rows).toBe(17)
    expect(letterLabelLayout.perPage).toBe(51)
    const plants = Array.from({ length: 103 }, (_, i) => plant('plant-' + i))
    const result = await createPlantLabelPdf(
      plants,
      [],
      new Map(),
      options,
      fonts,
    )
    expect(result.pdf.getNumberOfPages()).toBe(3)
    expect(result.sheets.map((sheet) => sheet.length)).toEqual([51, 51, 1])
    for (const [index, sheet] of result.sheets.entries()) {
      result.pdf.setPage(index + 1)
      expect(result.pdf.internal.pageSize.getWidth()).toBe(612)
      expect(result.pdf.internal.pageSize.getHeight()).toBe(792)
      expect(sheet[0]!.x).toBe(27)
      expect(sheet[0]!.y).toBe(36)
      for (const label of sheet) {
        expect([label.width, label.height]).toEqual([180, 36])
        expect(label.x + label.width).toBeLessThanOrEqual(585)
        expect(label.y + label.height).toBeLessThanOrEqual(756)
      }
    }
  })
  it('duplicates labels in sorted plant order and omits cutting guides when disabled', async () => {
    const result = await createPlantLabelPdf(
      [plant('a'), plant('b')],
      [],
      new Map(),
      { ...options, copies: 3, borders: false },
      fonts,
    )
    expect(result.sheets[0]!.map((p) => p.plantId)).toEqual([
      'a',
      'a',
      'a',
      'b',
      'b',
      'b',
    ])
    expect(result.pdf.getNumberOfPages()).toBe(1)
    expect(
      (result.pdf.internal.pages as unknown as string[][])[1]!.join('\n'),
    ).not.toMatch(/ re\b/)
    await expect(
      createPlantLabelPdf(
        [plant('a')],
        [],
        new Map(),
        { ...options, copies: 11 },
        fonts,
      ),
    ).rejects.toThrow('1 to 10')
  })
  it('renders optional NFC and location text, fits long names, and keeps text inside labels', async () => {
    const p = {
      ...plant('short-id', 'Étoile Alocasia Ninja Mint Variegated'),
      spaceId: 's',
    }
    const result = await createPlantLabelPdf(
      [p],
      [{ id: 's', name: 'Greenhouse' } as never],
      new Map([
        [p.id, { nfcAssigned: true, nfcCode: 'NFC-123', photoCount: 0 }],
      ]),
      { ...options, fields: new Set(labelFields.map((f) => f.id)) },
      fonts,
    )
    const text = result.sheets[0]![0]!.text
    expect(text[0]!.text).toBe(p.nickname)
    expect(text.some((line) => line.text.includes('...'))).toBe(false)
    expect(text.map((line) => line.text)).toContain('NFC: NFC-123')
    expect(text.map((line) => line.text)).toContain('Greenhouse')
    for (const line of text) {
      result.pdf
        .setFont('OrchardLabel', line.bold ? 'bold' : 'normal')
        .setFontSize(line.size)
      expect(result.pdf.getTextWidth(line.text)).toBeLessThanOrEqual(172)
      expect(line.y).toBeGreaterThan(0)
      expect(line.y + line.size * 0.25).toBeLessThan(36)
    }
    const missing = await createPlantLabelPdf(
      [{ ...plant('id'), scientificName: '', cultivar: undefined }],
      [],
      new Map(),
      { ...options, fields: new Set(labelFields.map((f) => f.id)) },
      fonts,
    )
    expect(missing.sheets[0]![0]!.text.map((line) => line.text)).toEqual([
      'id',
      'ID: id',
    ])
  })
  it('encodes the existing authenticated plant route with quiet zone, and omits local-only QR', async () => {
    const id = '55ad561b-99b2-41f3-ac0f-844e2ca23eb5'
    const result = await createPlantLabelPdf(
      [plant(id), plant('local-plant')],
      [],
      new Map(),
      { ...options, qr: true },
      fonts,
    )
    const qr = result.sheets[0]![0]!.qr!
    expect(qr.url).toBe('https://app.orchardcollection.ca/collection/' + id)
    expect(result.sheets[0]![1]!.qr).toBeUndefined()
    const local = await createPlantLabelPdf(
      [plant(id)],
      [],
      new Map(),
      { ...options, qr: true, localOnly: true },
      fonts,
    )
    expect(local.sheets[0]![0]!.qr).toBeUndefined()
    const size = qr.modules * 6
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255)
    for (const cell of qr.dark)
      for (let y = cell.y * 6; y < (cell.y + 1) * 6; y++)
        for (let x = cell.x * 6; x < (cell.x + 1) * 6; x++) {
          const offset = (y * size + x) * 4
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0
        }
    expect(jsQR(pixels, size, size)?.data).toBe(qr.url)
    expect(
      qr.dark.every(
        (cell) =>
          cell.x >= 4 &&
          cell.y >= 4 &&
          cell.x < qr.modules - 4 &&
          cell.y < qr.modules - 4,
      ),
    ).toBe(true)
  })
  it('rejects empty selections or label content rather than downloading blank sheets', async () => {
    await expect(
      createPlantLabelPdf([], [], new Map(), options, fonts),
    ).rejects.toThrow('Choose at least one plant')
    await expect(
      createPlantLabelPdf(
        [plant('a')],
        [],
        new Map(),
        { ...options, fields: new Set() },
        fonts,
      ),
    ).rejects.toThrow('field')
    await expect(
      createPlantLabelPdf(
        [plant('a')],
        [],
        new Map(),
        { ...options, fields: new Set(['nfc']) },
        fonts,
      ),
    ).rejects.toThrow('no content')
  })
})

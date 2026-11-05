import { describe, expect, it } from 'vitest'
import { walk } from '../drawing/primitives'
import { migrateProject } from './migrations'
import { newProject, type Perspective } from './schema'
import { perspectiveSheet } from './perspective-sheet'

const view: Perspective = {
  id: 'v',
  title: 'Sala aberta',
  assetId: 'image',
  widthPx: 1600,
  heightPx: 900,
}
describe('perspectivas nas pranchas', () => {
  it('migra v10 sem modificar itens nem inventar capturas', () => {
    const old = { ...newProject('e'), schemaVersion: 10 }
    const result = migrateProject(old)
    expect(result.schemaVersion).toBe(11)
    expect(result.environments).toEqual(old.environments)
    expect(old.schemaVersion).toBe(10)
  })
  it.each(['A4', 'A3', 'A2', 'A1'] as const)(
    'mantém proporção e área útil em %s, nas duas orientações',
    (paper) => {
      for (const orientation of ['portrait', 'landscape'] as const) {
        const project = newProject('e'),
          env = project.environments[0]!
        env.sheet = { paper, orientation }
        const sheet = perspectiveSheet(project, env, view, 'data:image/png;base64,abc', {
          brand: { name: 'Escritório', lines: [] },
        })
        const primitives = [...walk(sheet.primitives)]
        const image = primitives.find((p) => p.kind === 'image')!
        expect(image.kind).toBe('image')
        if (image.kind !== 'image') return
        expect(image.width / image.height).toBeCloseTo(16 / 9)
        expect(image.x).toBeGreaterThanOrEqual(25)
        expect(image.y).toBeGreaterThanOrEqual(24)
        expect(image.x + image.width).toBeLessThan(sheet.widthMm - 6)
        expect(image.y + image.height).toBeLessThan(sheet.heightMm - 38)
        expect(primitives.some((p) => p.kind === 'text' && p.text === 'SEM ESCALA')).toBe(true)
        expect(primitives.some((p) => p.kind === 'text' && p.text === 'Escritório')).toBe(true)
        expect(primitives.some((p) => p.kind === 'text' && /^1:/.test(p.text))).toBe(false)
      }
    },
  )
})

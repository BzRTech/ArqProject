import { describe, expect, it } from 'vitest'
import { walk } from '../drawing/primitives'
import { vec } from '../geometry/vec'
import { graphicScale } from './graphic-scale'
import { nbrMargins, paperSize } from './paper'

describe('paper', () => {
  it('A3 paisagem e A4 retrato', () => {
    expect(paperSize('A3')).toMatchObject({ widthMm: 420, heightMm: 297 })
    expect(paperSize('A4', 'portrait')).toMatchObject({ widthMm: 210, heightMm: 297 })
  })
  it('margens NBR 10068', () => {
    expect(nbrMargins('A3')).toEqual({ top: 7, right: 7, bottom: 7, left: 25 })
    expect(nbrMargins('A1').top).toBe(10)
  })
})

describe('graphicScale', () => {
  it('5 m em 1:50 medem 100 mm, blocos de 20 mm', () => {
    const g = graphicScale({ at: vec(30, 200), scale: 50, meters: 5 })
    const blocks = [...walk([g])].filter((p) => p.kind === 'polyline')
    expect(blocks).toHaveLength(5)
    const last = blocks[4]!
    if (last.kind !== 'polyline') throw new Error()
    expect(last.points[1]!.x).toBeCloseTo(130)
    const labels = [...walk([g])].flatMap((p) => (p.kind === 'text' ? [p.text] : []))
    expect(labels).toEqual(['0', '1', '2', '3', '4', '5 m', 'ESCALA 1:50'])
  })
})

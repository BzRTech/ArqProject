import { describe, expect, it } from 'vitest'
import { vec } from '../geometry/vec'
import { compileView, PAPER_VIEW, type View } from './compile'
import { walk, type Primitive } from './primitives'
import { CAP_HEIGHT } from './text-metrics'

const V50: View = { scale: 50, origin: vec(60, 140) }
const one = (ps: Primitive[]) => ps[0]!

describe('compileView — modelo para papel', () => {
  it('linha de 4 m vira 80 mm em 1:50, na origem dada', () => {
    const p = one(compileView([{ kind: 'line', a: vec(0, 0), b: vec(4000, 0) }], V50))
    expect(p).toMatchObject({ kind: 'line', a: { x: 60, y: 140 }, b: { x: 140, y: 140 } })
  })

  it('pena e traço vêm em mm de papel, independentes da escala', () => {
    const p = one(
      compileView(
        [{ kind: 'line', a: vec(0, 0), b: vec(1, 0), style: { weight: 0.5, lineType: 'dashed' } }],
        { scale: 100, origin: vec(0, 0) },
      ),
    )
    expect(p.kind === 'line' && p.stroke).toEqual({
      color: '#000000',
      width: 0.5,
      dash: [3, 1.5],
      cap: 'butt',
    })
  })

  it('retângulo vira polilinha fechada', () => {
    const p = one(compileView([{ kind: 'rect', x: 0, y: 0, width: 2000, height: 1000 }], V50))
    expect(p.kind === 'polyline' && p.points).toEqual([
      { x: 60, y: 140 },
      { x: 100, y: 140 },
      { x: 100, y: 160 },
      { x: 60, y: 160 },
    ])
  })

  it('arco de porta de 80 cm (90°, horário) em 1:50', () => {
    const p = one(
      compileView(
        [{ kind: 'arc', center: vec(0, 0), radius: 800, startDeg: 0, sweepDeg: 90 }],
        V50,
      ),
    )
    expect(p.kind).toBe('arc')
    if (p.kind !== 'arc') return
    expect(p.r).toBe(16)
    expect(p.from.x).toBeCloseTo(76)
    expect(p.from.y).toBeCloseTo(140)
    expect(p.to.x).toBeCloseTo(60)
    expect(p.to.y).toBeCloseTo(156)
    expect(p.clockwise).toBe(true)
    expect(p.largeArc).toBe(false)
  })

  it('arco de 360° vira círculo', () => {
    const p = one(
      compileView(
        [{ kind: 'arc', center: vec(0, 0), radius: 500, startDeg: 0, sweepDeg: 360 }],
        V50,
      ),
    )
    expect(p.kind).toBe('circle')
  })

  it('texto: tamanho fica em mm de papel; alinhamento "middle" desce a linha de base', () => {
    const p = one(
      compileView(
        [{ kind: 'text', at: vec(1000, 1000), text: 'SALA', size: 4, vAlign: 'middle' }],
        V50,
      ),
    )
    expect(p).toMatchObject({ kind: 'text', size: 4, anchor: 'start', rotationDeg: 0 })
    if (p.kind !== 'text') return
    expect(p.at.x).toBeCloseTo(80)
    expect(p.at.y).toBeCloseTo(160 + (CAP_HEIGHT / 2) * 4)
  })

  it('texto girado 90°: deslocamento vertical acompanha a rotação', () => {
    const p = one(
      compileView(
        [{ kind: 'text', at: vec(0, 0), text: 'X', size: 2, vAlign: 'top', rotationDeg: 90 }],
        PAPER_VIEW,
      ),
    )
    if (p.kind !== 'text') throw new Error()
    // "para cima" do texto girado 90° é +x; alinhar pelo topo empurra a base para -x
    expect(p.at.x).toBeCloseTo(-CAP_HEIGHT * 2)
    expect(p.at.y).toBeCloseTo(0)
  })

  it('hachura com espaçamento fixo no papel, qualquer que seja a escala', () => {
    const square = [vec(0, 0), vec(1000, 0), vec(1000, 1000), vec(0, 1000)]
    const count = (scale: number) =>
      [
        ...walk(
          compileView(
            [
              {
                kind: 'hatch',
                boundary: square,
                pattern: { kind: 'lines', angleDeg: 0, spacing: 2 },
              },
            ],
            { scale, origin: vec(0, 0) },
          ),
        ),
      ].filter((p) => p.kind === 'line').length
    expect(count(50)).toBe(10) // 20 mm de papel / 2
    expect(count(20)).toBe(25) // 50 mm de papel / 2
  })

  it('hachura cruzada usa dois ângulos', () => {
    const square = [vec(0, 0), vec(10, 0), vec(10, 10), vec(0, 10)]
    const g = one(
      compileView(
        [{ kind: 'hatch', boundary: square, pattern: { kind: 'cross', angleDeg: 0, spacing: 5 } }],
        PAPER_VIEW,
      ),
    )
    const ls = [...walk([g])].filter((p) => p.kind === 'line')
    expect(ls).toHaveLength(4)
  })

  it('imagem escalada', () => {
    const p = one(
      compileView([{ kind: 'image', x: 0, y: 0, width: 5000, height: 2500, href: 'data:x' }], V50),
    )
    expect(p).toMatchObject({ kind: 'image', x: 60, y: 140, width: 100, height: 50, opacity: 1 })
  })

  it('grupo preserva o papel (role) e compila os filhos', () => {
    const p = one(
      compileView(
        [
          {
            kind: 'group',
            role: 'paredes',
            children: [{ kind: 'line', a: vec(0, 0), b: vec(50, 0) }],
          },
        ],
        V50,
      ),
    )
    expect(p).toMatchObject({
      kind: 'group',
      role: 'paredes',
      children: [{ kind: 'line', b: { x: 61, y: 140 } }],
    })
  })
})

import { describe, expect, it } from 'vitest'
import { compileView } from '@/core/drawing/compile'
import { vec } from '@/core/geometry/vec'
import { toMarkup } from './markup'
import { primitivesToSvg } from './primitives-to-svg'

const sheet = { widthMm: 420, heightMm: 297 }

describe('primitivesToSvg', () => {
  it('raiz em mm de papel', () => {
    const svg = toMarkup(primitivesToSvg([], { ...sheet, background: '#fff' }))
    expect(svg).toContain('width="420mm"')
    expect(svg).toContain('viewBox="0 0 420 297"')
    expect(svg).toContain('<rect x="0" y="0" width="420" height="297" fill="#fff"/>')
  })

  it('linha tracejada com pena em mm', () => {
    const prims = compileView(
      [
        {
          kind: 'line',
          a: vec(0, 0),
          b: vec(4000, 0),
          style: { weight: 0.35, lineType: 'dashed' },
        },
      ],
      { scale: 50, origin: vec(60, 140) },
    )
    expect(toMarkup(primitivesToSvg(prims, sheet))).toContain(
      '<line x1="60" y1="140" x2="140" y2="140" stroke="#000000" stroke-width="0.35" stroke-linecap="butt" stroke-dasharray="3 1.5"/>',
    )
  })

  it('arco vira path com flags corretas', () => {
    const prims = compileView(
      [{ kind: 'arc', center: vec(0, 0), radius: 800, startDeg: 0, sweepDeg: 90 }],
      {
        scale: 50,
        origin: vec(0, 0),
      },
    )
    expect(toMarkup(primitivesToSvg(prims, sheet))).toContain('d="M 16 0 A 16 16 0 0 1 0 16"')
  })

  it('texto escapado, girado e com fonte', () => {
    const prims = compileView(
      [{ kind: 'text', at: vec(10, 20), text: 'A < B & "C"', size: 3, rotationDeg: -90 }],
      { scale: 1, origin: vec(0, 0) },
    )
    const svg = toMarkup(primitivesToSvg(prims, sheet))
    expect(svg).toContain('font-family="Roboto"')
    expect(svg).toContain('transform="rotate(-90 10 20)"')
    expect(svg).toContain('>A &lt; B &amp; "C"</text>')
  })

  it('grupo carrega data-role', () => {
    const prims = compileView([{ kind: 'group', role: 'paredes', children: [] }], {
      scale: 1,
      origin: vec(0, 0),
    })
    expect(toMarkup(primitivesToSvg(prims, sheet))).toContain('<g data-role="paredes"/>')
  })
})

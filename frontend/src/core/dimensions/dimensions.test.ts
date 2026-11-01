import { describe, expect, it } from 'vitest'
import { compileView, type View } from '../drawing/compile'
import { walk, type Primitive } from '../drawing/primitives'
import { textWidth } from '../drawing/text-metrics'
import { vec, type Vec2 } from '../geometry/vec'
import { chainValues, readableRotation } from './layout'
import { DEFAULT_DIM_STYLE as S } from './style'

type TextPrim = Extract<Primitive, { kind: 'text' }>
type LinePrim = Extract<Primitive, { kind: 'line' }>

const texts = (ps: Primitive[]) => [...walk(ps)].filter((p): p is TextPrim => p.kind === 'text')
const lines = (ps: Primitive[]) => [...walk(ps)].filter((p): p is LinePrim => p.kind === 'line')
const group = (ps: Primitive[], role: string) =>
  [...walk(ps)].find((p) => p.kind === 'group' && p.role === role) as Extract<
    Primitive,
    { kind: 'group' }
  >

const close = (a: Vec2, b: Vec2, d = 6) => {
  expect(a.x).toBeCloseTo(b.x, d)
  expect(a.y).toBeCloseTo(b.y, d)
}

const V20: View = { scale: 20, origin: vec(10, 100) }

describe('chainValues', () => {
  it('soma dos vãos = total, mesmo com posições fracionárias', () => {
    const pos = [0, 333.4, 666.8, 1000.2]
    const v = chainValues(pos)
    expect(v).toEqual([333, 334, 333])
    expect(v.reduce((a, b) => a + b, 0)).toBe(1000)
  })
})

describe('readableRotation (NBR 10126: ler de baixo ou da direita)', () => {
  it.each([
    [vec(1, 0), 0],
    [vec(-1, 0), 0],
    [vec(0, 1), -90],
    [vec(0, -1), -90],
    [vec(1, 1), 45],
    [vec(-1, -1), 45],
    [vec(1, -1), -45],
  ])('%o → %i°', (dir, deg) => {
    expect(readableRotation(dir)).toBeCloseTo(deg)
  })
})

describe('cota simples', () => {
  it('parede de 4 m em 1:50: linha de cota com 80 mm e texto "400"', () => {
    const view: View = { scale: 50, origin: vec(60, 140) }
    const ps = compileView(
      [
        {
          kind: 'dimension',
          p1: vec(0, 0),
          p2: vec(4000, 0),
          orientation: 'horizontal',
          offset: 10,
        },
      ],
      view,
    )
    expect(texts(ps).map((t) => t.text)).toEqual(['400'])
    // Traços oblíquos centrados nos pontos projetados: (60,130) e (140,130)
    const ticks = lines(ps).filter((l) => l.stroke.width === S.tickWeight)
    expect(ticks).toHaveLength(2)
    close(
      { x: (ticks[0]!.a.x + ticks[0]!.b.x) / 2, y: (ticks[0]!.a.y + ticks[0]!.b.y) / 2 },
      vec(60, 130),
    )
    close(
      { x: (ticks[1]!.a.x + ticks[1]!.b.x) / 2, y: (ticks[1]!.a.y + ticks[1]!.b.y) / 2 },
      vec(140, 130),
    )
    // Traço a 45°, subindo para a direita (y para baixo)
    const t = ticks[0]!
    expect(t.b.x - t.a.x).toBeCloseTo(-(t.b.y - t.a.y))
  })

  it('linhas de chamada começam com folga do objeto e passam da linha de cota', () => {
    const ps = compileView(
      [
        {
          kind: 'dimension',
          p1: vec(0, 0),
          p2: vec(4000, 0),
          orientation: 'horizontal',
          offset: 10,
        },
      ],
      { scale: 50, origin: vec(0, 50) },
    )
    const ext = lines(ps).filter((l) => l.stroke.width === S.lineWeight && l.a.x === l.b.x)
    expect(ext).toHaveLength(2)
    expect(ext[0]!.a.y).toBeCloseTo(50 - S.extGap)
    expect(ext[0]!.b.y).toBeCloseTo(50 - 10 - S.extOvershoot)
  })

  it('offset negativo põe a cota abaixo e o texto continua do lado de fora', () => {
    const ps = compileView(
      [
        {
          kind: 'dimension',
          p1: vec(0, 0),
          p2: vec(1000, 0),
          orientation: 'horizontal',
          offset: -8,
        },
      ],
      V20,
    )
    const [t] = texts(ps)
    // linha em y = 100 + 8; texto abaixo dela (baseline mais para baixo que a linha)
    expect(t!.at.y).toBeGreaterThan(108 + S.textGap)
  })

  it('vertical: texto girado -90° e à esquerda quando offset positivo (p1 em cima)', () => {
    const ps = compileView(
      [{ kind: 'dimension', p1: vec(0, 0), p2: vec(0, 2700), orientation: 'vertical', offset: 8 }],
      V20,
    )
    const [t] = texts(ps)
    expect(t!.text).toBe('270')
    expect(t!.rotationDeg).toBe(-90)
    // normal à esquerda de (0,1) é (+1,0): linha em x = 10 + 8, texto para fora (x maior)
    expect(t!.at.x).toBeGreaterThan(18)
  })

  it('alinhada mede a distância real', () => {
    const ps = compileView(
      [{ kind: 'dimension', p1: vec(0, 0), p2: vec(3000, 4000), offset: 5 }],
      V20,
    )
    expect(texts(ps)[0]!.text).toBe('500')
    expect(texts(ps)[0]!.rotationDeg).toBeCloseTo(53.13, 2)
  })

  it('texto que não cabe vai para fora, depois do último traço', () => {
    const ps = compileView(
      [{ kind: 'dimension', p1: vec(0, 0), p2: vec(18, 0), orientation: 'horizontal', offset: 5 }],
      V20,
    )
    const [t] = texts(ps)
    expect(t!.text).toBe('1,8')
    const endX = 10 + 18 / 20
    expect(t!.at.x - textWidth('1,8', S.textSize) / 2).toBeGreaterThan(endX)
  })

  it('texto substituto', () => {
    const ps = compileView(
      [{ kind: 'dimension', p1: vec(0, 0), p2: vec(1000, 0), offset: 5, text: 'VARIÁVEL' }],
      V20,
    )
    expect(texts(ps)[0]!.text).toBe('VARIÁVEL')
  })
})

describe('cota em cadeia — rack do vídeo (3180 mm, módulos 909/909/909/303)', () => {
  const xs = [0, 909, 1818, 2727, 3180]
  const ps = compileView(
    [
      {
        kind: 'chain',
        points: xs.map((x) => vec(x, 0)),
        orientation: 'horizontal',
        offset: 8,
        total: true,
      },
    ],
    V20,
  )

  it('textos dos vãos e do total', () => {
    expect(texts(group(ps, 'chain-row').children).map((t) => t.text)).toEqual([
      '90,9',
      '90,9',
      '90,9',
      '45,3',
    ])
    expect(texts(group(ps, 'chain-total').children).map((t) => t.text)).toEqual(['318'])
  })

  it('traços nos pontos exatos em escala 1:20', () => {
    const ticks = lines(group(ps, 'chain-row').children).filter(
      (l) => l.stroke.width === S.tickWeight,
    )
    const mids = ticks.map((t) => (t.a.x + t.b.x) / 2)
    xs.forEach((x, i) => expect(mids[i]).toBeCloseTo(10 + x / 20, 9))
  })

  it('linha de total fica uma linha (rowGap) acima da cadeia', () => {
    const rowTicks = lines(group(ps, 'chain-row').children).filter(
      (l) => l.stroke.width === S.tickWeight,
    )
    const totTicks = lines(group(ps, 'chain-total').children).filter(
      (l) => l.stroke.width === S.tickWeight,
    )
    const y = (l: LinePrim) => (l.a.y + l.b.y) / 2
    expect(y(rowTicks[0]!)).toBeCloseTo(100 - 8)
    expect(y(totTicks[0]!)).toBeCloseTo(100 - 8 - S.rowGap)
  })

  it('extremidades: só a linha de total tem linha de chamada (sem duplicar)', () => {
    const rowExt = lines(group(ps, 'chain-row').children).filter(
      (l) => l.stroke.width === S.lineWeight && l.a.x === l.b.x,
    )
    expect(rowExt.map((l) => l.a.x)).toEqual(
      [909, 1818, 2727].map((x) => expect.closeTo(10 + x / 20, 9) as unknown as number),
    )
  })

  it('aceita pontos fora de ordem', () => {
    const shuffled = compileView(
      [
        {
          kind: 'chain',
          points: [vec(0, 0), vec(2727, 0), vec(909, 0), vec(3180, 0), vec(1818, 0)],
          orientation: 'horizontal',
          offset: 8,
        },
      ],
      V20,
    )
    expect(texts(shuffled).map((t) => t.text)).toEqual(['90,9', '90,9', '90,9', '45,3'])
  })
})

describe('cota em cadeia com vão pequeno no meio', () => {
  it('escalona o texto que não cabe para uma linha acima', () => {
    const ps = compileView(
      [
        {
          kind: 'chain',
          points: [vec(0, 0), vec(1500, 0), vec(1518, 0), vec(3000, 0)],
          orientation: 'horizontal',
          offset: 8,
        },
      ],
      V20,
    )
    const ts = texts(ps)
    expect(ts.map((t) => t.text)).toEqual(['150', '1,8', '148,2'])
    expect(ts[1]!.at.y).toBeLessThan(ts[0]!.at.y - 1) // mais para cima (y para baixo)
    expect(ts[2]!.at.y).toBeCloseTo(ts[0]!.at.y)
  })
})

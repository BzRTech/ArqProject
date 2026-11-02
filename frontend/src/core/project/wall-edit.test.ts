import { describe, expect, it } from 'vitest'
import { walk } from '../drawing/primitives'
import { compileView } from '../drawing/compile'
import { area } from '../geometry/polygon'
import { vec } from '../geometry/vec'
import { openingFrame } from './openings'
import { environmentEntities } from './render'
import { newProject, type Opening, type Wall } from './schema'
import { wallsShape } from './wall-union'
import {
  insertVertex,
  moveVertex,
  moveVertexLinked,
  pushSegment,
  pushSegmentLinked,
  reattachOpenings,
  removeVertex,
  setSegmentLength,
  setSegmentLengthLinked,
} from './wall-edit'

// Quarto 4,40 × 3,80 interno (eixo -75..4475 × -75..3875), sentido horário visual
const quarto: Wall = {
  id: 'q',
  kind: 'wall',
  points: [vec(-75, -75), vec(4475, -75), vec(4475, 3875), vec(-75, 3875)],
  closed: true,
  thicknessMm: 150,
}
// Banheiro 2,00 × 2,50 interno encostado à direita: a parede da esquerda dele SOBREPÕE a do quarto
const banheiro: Wall = {
  id: 'b',
  kind: 'wall',
  points: [vec(4475, -75), vec(6625, -75), vec(6625, 2575), vec(4475, 2575)],
  closed: true,
  thicknessMm: 150,
}
const door = (patch: Partial<Opening> = {}): Opening => ({
  id: 'p',
  wallId: 'q',
  segment: 1, // parede da direita do quarto (a compartilhada)
  offsetMm: 1500,
  widthMm: 700,
  heightMm: 2100,
  sillMm: 0,
  type: 'porta-abrir',
  hinge: 'start',
  side: 'left',
  ...patch,
})

const ringArea = (shape: ReturnType<typeof wallsShape>) =>
  shape.reduce(
    (s, poly) =>
      s +
      poly.reduce(
        (a, ring, k) => a + (k === 0 ? 1 : -1) * area(ring.map(([x, y]) => vec(x, y))),
        0,
      ),
    0,
  )

describe('paredes como uma figura (união)', () => {
  it('quarto + banheiro encostados viram uma figura só, sem parede dupla', () => {
    const shape = wallsShape([quarto, banheiro], [])
    expect(shape).toHaveLength(1) // um polígono
    expect(shape[0]!.length).toBe(3) // contorno externo + 2 furos (quarto e banheiro)
    // área = soma das duas menos a faixa sobreposta: 15 cm × (de y=-150 a y=2650)
    const sep = ringArea(wallsShape([quarto], [])) + ringArea(wallsShape([banheiro], []))
    const overlap = 150 * (2650 - -150)
    expect(ringArea(shape)).toBeCloseTo(sep - overlap, 0)
  })

  it('porta na parede compartilhada corta as DUAS paredes', () => {
    const withDoor = wallsShape([quarto, banheiro], [door()])
    const without = wallsShape([quarto, banheiro], [])
    expect(ringArea(without) - ringArea(withDoor)).toBeCloseTo(700 * 150, 0)
  })

  it('o ambiente desenha a figura unida e os símbolos das portas', () => {
    const p = newProject('e')
    const env = p.environments[0]!
    env.drawings.push(quarto, banheiro)
    env.openings.push(door())
    const prims = [
      ...walk(
        compileView(environmentEntities(env, { scale: 50 }), { scale: 50, origin: vec(0, 0) }),
      ),
    ]
    expect(prims.filter((x) => x.kind === 'arc')).toHaveLength(1)
  })
})

describe('edição de paredes', () => {
  it('mover um canto', () => {
    expect(moveVertex(quarto, 2, vec(5000, 4000)).points[2]).toEqual(vec(5000, 4000))
  })

  it('empurrar a parede da direita 50 cm para fora aumenta o quarto e mantém o retângulo', () => {
    // trecho 1 vai para baixo (0,1); a esquerda dele é +x (para fora)
    const w = pushSegment(quarto, 1, 500)
    expect(w.points).toEqual([vec(-75, -75), vec(4975, -75), vec(4975, 3875), vec(-75, 3875)])
  })

  it('comprimento digitado em parede fechada empurra o trecho seguinte', () => {
    const w = setSegmentLength(quarto, 0, 5000) // trecho de cima: 4550 → 5000
    expect(w.points).toEqual([vec(-75, -75), vec(4925, -75), vec(4925, 3875), vec(-75, 3875)])
  })

  it('comprimento em parede aberta leva o resto junto', () => {
    const open: Wall = {
      ...quarto,
      closed: false,
      points: [vec(0, 0), vec(3000, 0), vec(3000, 2000)],
    }
    expect(setSegmentLength(open, 0, 4000).points).toEqual([
      vec(0, 0),
      vec(4000, 0),
      vec(4000, 2000),
    ])
  })

  it('criar e remover canto', () => {
    const w = insertVertex(quarto, 0, vec(2000, 300))
    expect(w.points[1]).toEqual(vec(2000, -75))
    expect(removeVertex(w, 1).points).toEqual(quarto.points)
    // não deixa um ambiente fechado com menos de 3 cantos
    const tri: Wall = { ...quarto, points: quarto.points.slice(0, 3) }
    expect(removeVertex(tri, 0)).toBe(tri)
  })

  it('empurrar a parede mantém a porta da parede de baixo no mesmo lugar do mundo', () => {
    const bottom = door({ segment: 2, offsetMm: 3075 }) // centro em x = 1400
    const before = openingFrame(quarto, bottom)!.center
    const pushed = pushSegment(quarto, 1, 500)
    const [moved] = reattachOpenings(quarto, pushed, [bottom])
    expect(openingFrame(pushed, moved!)!.center).toEqual(before)
    expect(moved!.offsetMm).toBe(3575)
  })

  it('porta na parede empurrada acompanha a parede', () => {
    const pushed = pushSegment(quarto, 1, 500)
    const [moved] = reattachOpenings(quarto, pushed, [door()])
    expect(moved!.segment).toBe(1)
    expect(openingFrame(pushed, moved!)!.center.x).toBe(4975)
  })

  it('remover o canto mantém a porta no trecho resultante', () => {
    const w = insertVertex(quarto, 2, vec(2000, 3875))
    const o = door({ segment: 3, offsetMm: 600 }) // trecho de (2000,3875) a (-75,3875)
    const merged = removeVertex(w, 3)
    const [re] = reattachOpenings(w, merged, [o])
    expect(re!.segment).toBe(2)
  })
})

describe('edições ligadas (paredes encostadas acompanham)', () => {
  const pts = (ws: Wall[], id: string) => ws.find((w) => w.id === id)!.points

  it('empurrar a parede compartilhada leva a do banheiro junto (os dois continuam retângulos)', () => {
    const out = pushSegmentLinked([quarto, banheiro], 'q', 1, 300) // parede da direita do quarto, +30 cm
    expect(pts(out, 'q')).toEqual([vec(-75, -75), vec(4775, -75), vec(4775, 3875), vec(-75, 3875)])
    // o trecho esquerdo do banheiro (de (4475,2575) a (4475,-75)) foi junto; o resto ficou
    expect(pts(out, 'b')).toEqual([
      vec(4775, -75),
      vec(6625, -75),
      vec(6625, 2575),
      vec(4775, 2575),
    ])
  })

  it('parede que não encosta não se mexe', () => {
    const longe: Wall = {
      ...banheiro,
      id: 'l',
      points: banheiro.points.map((p) => vec(p.x + 5000, p.y)),
    }
    const out = pushSegmentLinked([quarto, longe], 'q', 1, 300)
    expect(pts(out, 'l')).toEqual(longe.points)
  })

  it('comprimento digitado no quarto NÃO mexe no banheiro: cresce pelo lado livre', () => {
    // trecho de cima: 4550 → 5000. O trecho seguinte (direita) é a parede compartilhada,
    // então quem anda é o trecho anterior (esquerda).
    const out = setSegmentLengthLinked([quarto, banheiro], 'q', 0, 5000)
    expect(pts(out, 'q')).toEqual([
      vec(-525, -75),
      vec(4475, -75),
      vec(4475, 3875),
      vec(-525, 3875),
    ])
    expect(pts(out, 'b')).toEqual(banheiro.points)
  })

  it('banheiro: encurtar o trecho de baixo puxa a parede de fora, não a compartilhada', () => {
    // trecho 2 (embaixo, da direita para a esquerda): 2150 → 1650; o seguinte é o compartilhado
    const out = setSegmentLengthLinked([quarto, banheiro], 'b', 2, 1650)
    expect(pts(out, 'b')).toEqual([
      vec(4475, -75),
      vec(6125, -75),
      vec(6125, 2575),
      vec(4475, 2575),
    ])
    expect(pts(out, 'q')).toEqual(quarto.points)
  })

  it('sem paredes compartilhadas, continua empurrando o trecho seguinte', () => {
    const out = setSegmentLengthLinked([banheiro], 'b', 0, 2500)
    expect(pts(out, 'b')[1]).toEqual(vec(6975, -75))
    expect(pts(out, 'b')[0]).toEqual(vec(4475, -75))
  })

  it('compartilhado dos dois lados: aí não tem jeito, empurra o seguinte (e o vizinho junto)', () => {
    // um terceiro cômodo encostado à esquerda do quarto
    const sala: Wall = {
      id: 's',
      kind: 'wall',
      points: [vec(-3075, -75), vec(-75, -75), vec(-75, 3875), vec(-3075, 3875)],
      closed: true,
      thicknessMm: 150,
    }
    const out = setSegmentLengthLinked([sala, quarto, banheiro], 'q', 0, 5000)
    expect(pts(out, 'q')[1]).toEqual(vec(4925, -75))
    expect(pts(out, 'b')[0]).toEqual(vec(4925, -75))
    expect(pts(out, 's')).toEqual(sala.points)
  })

  it('parede aberta: se a ponta seguinte está ligada a outra parede, anda a outra ponta', () => {
    const rabicho: Wall = {
      id: 'r',
      kind: 'wall',
      points: [vec(1000, 1000), vec(4475, 1000)], // termina NA parede do quarto (canto no eixo)
      closed: false,
      thicknessMm: 150,
    }
    const quartoComCanto: Wall = {
      ...quarto,
      points: [vec(-75, -75), vec(4475, -75), vec(4475, 1000), vec(4475, 3875), vec(-75, 3875)],
    }
    const out = setSegmentLengthLinked([quartoComCanto, rabicho], 'r', 0, 3000)
    expect(pts(out, 'r')).toEqual([vec(1475, 1000), vec(4475, 1000)])
    expect(pts(out, 'q')).toEqual(quartoComCanto.points)
  })

  it('mover canto leva os cantos coincidentes', () => {
    const out = moveVertexLinked([quarto, banheiro], 'q', 1, vec(4600, -200))
    expect(pts(out, 'q')[1]).toEqual(vec(4600, -200))
    expect(pts(out, 'b')[0]).toEqual(vec(4600, -200))
  })
})

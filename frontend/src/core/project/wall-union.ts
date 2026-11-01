import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping'
import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import { add, scale, type Vec2 } from '../geometry/vec'
import { openingFrame } from './openings'
import type { Opening, Wall } from './schema'
import { wallOutline } from './walls'

/**
 * Paredes do ambiente como UMA figura: união de todas as paredes, menos os vãos de portas e
 * janelas. Assim, paredes encostadas ou sobrepostas (quarto + banheiro) viram uma só, encontros
 * em T ficam limpos e um vão numa parede compartilhada corta as duas.
 */

const toRing = (pts: Vec2[]): Ring => pts.map((p) => [p.x, p.y] as [number, number])
const fromRing = (r: Ring): Vec2[] => {
  const pts = r.map(([x, y]) => ({ x, y }))
  // polygon-clipping repete o primeiro ponto no fim
  const last = pts[pts.length - 1]
  if (last && pts.length > 1 && last.x === pts[0]!.x && last.y === pts[0]!.y) pts.pop()
  return pts
}

/** Sólido de uma parede (sem vãos), no formato de polígonos com furos. */
function wallSolid(w: Wall): Polygon[] {
  const o = wallOutline(w.points, w.thicknessMm, w.closed)
  if (!o) return []
  return o.closed ? [[toRing(o.rings[0]!), toRing(o.rings[1]!)]] : [[toRing(o.rings[0]!)]]
}

/** Folga além da face, para o vão cortar também uma parede sobreposta. */
const CUT_MARGIN = 10

function openingCut(w: Wall, o: Opening): Polygon | null {
  const f = openingFrame(w, o)
  if (!f) return null
  const h = f.halfThickness + CUT_MARGIN
  return [
    toRing([
      add(f.a, scale(f.n, h)),
      add(f.b, scale(f.n, h)),
      add(f.b, scale(f.n, -h)),
      add(f.a, scale(f.n, -h)),
    ]),
  ]
}

export function wallsShape(walls: readonly Wall[], openings: readonly Opening[]): MultiPolygon {
  const solids = walls.flatMap(wallSolid)
  if (!solids.length) return []
  const byId = new Map(walls.map((w) => [w.id, w]))
  const cuts = openings.flatMap((o) => {
    const w = byId.get(o.wallId)
    const c = w && openingCut(w, o)
    return c ? [c] : []
  })
  const [first, ...rest] = solids
  const merged = polygonClipping.union(first!, ...rest)
  return cuts.length ? polygonClipping.difference(merged, ...cuts) : merged
}

/** Hachura + contornos da figura das paredes. */
export function wallsShapeEntities(shape: MultiPolygon, color = '#000000'): Entity[] {
  return shape.flatMap((poly): Entity[] => {
    const rings = poly.map(fromRing)
    const [outer, ...holes] = rings
    if (!outer || outer.length < 3) return []
    return [
      {
        kind: 'hatch',
        boundary: outer,
        holes,
        pattern: { kind: 'lines', angleDeg: 45, spacing: 0.8 },
        style: { color },
      },
      ...rings.map((r): Entity => ({
        kind: 'polyline',
        points: r,
        closed: true,
        style: { weight: PEN.thick, color },
      })),
    ]
  })
}

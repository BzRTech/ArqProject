import type { Entity } from '../drawing/entities'
import { PEN } from '../drawing/styles'
import { area, centroid, perimeter } from '../geometry/polygon'
import { formatAreaM2 } from '../units'
import type { AreaDrawing, Wall } from './schema'
import { wallOutline, wallPoints } from './walls'

export function areaLabelCenter(d: Pick<AreaDrawing, 'points' | 'labelOffset'>) {
  const c = centroid(d.points)
  return { x: c.x + (d.labelOffset?.x ?? 0), y: c.y + (d.labelOffset?.y ?? 0) }
}

export const areaM2Text = (d: Pick<AreaDrawing, 'points'>): string => formatAreaM2(area(d.points))
export const areaPerimeterMm = (d: Pick<AreaDrawing, 'points'>): number => perimeter(d.points)

/** Contorno tracejado leve + nome e m² no centroide. Texto em mm de papel. */
export function areaEntities(d: AreaDrawing, scale: number): Entity[] {
  const c = areaLabelCenter(d)
  const gap = 1.8 * scale
  const out: Entity[] = [
    {
      kind: 'polyline',
      points: d.points,
      closed: true,
      style: { weight: PEN.extraFine, lineType: 'dashed', color: '#8a8478' },
    },
    {
      kind: 'text',
      at: { x: c.x, y: c.y + (d.name ? gap : 0) },
      text: areaM2Text(d),
      size: 2.2,
      anchor: 'middle',
      vAlign: 'middle',
    },
  ]
  if (d.floor) {
    out.push({
      kind: 'text',
      at: { x: c.x, y: c.y + gap * 2.6 },
      text: d.floor.name,
      size: 1.9,
      anchor: 'middle',
      vAlign: 'middle',
      color: '#59626d',
    })
  }
  if (d.name) {
    out.push({
      kind: 'text',
      at: { x: c.x, y: c.y - gap },
      text: d.name.toUpperCase(),
      size: 2.6,
      anchor: 'middle',
      vAlign: 'middle',
      weight: 'bold',
    })
  }
  return out
}

/** Polígono das faces internas de uma parede fechada (para "área do ambiente"). */
export function innerFacePolygon(wall: Wall) {
  if (!wall.closed) return null
  const o = wallOutline(wallPoints(wall), wall.thicknessMm, true)
  if (!o || o.rings.length < 2) return null
  const [r1, r2] = o.rings as [(typeof o.rings)[0], (typeof o.rings)[0]]
  return (area(r1) < area(r2) ? r1 : r2).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
}

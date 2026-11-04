import type { Item } from '../project/schema'
import type { RuleProfile } from '../joinery/rules'
import { solveJoinery } from '../joinery/solve'
import type { SceneBox } from './model'

/** Places the solved panels. Doors pivot on their hinge, drawers translate forward. */
export function joineryBoxes(item: Item, rules: RuleProfile, open: boolean): SceneBox[] {
  const design = item.joinery?.design
  if (!design) return []
  const s = solveJoinery(item.sizeMm, design, rules)
  const lift = design.base.kind === 'floor' ? 0 : design.base.heightMm
  const back = rules.back.recessMm + rules.back.thicknessMm
  const boxes: SceneBox[] = []
  const add = (
    name: string,
    part: 'corpo' | 'frentes' | 'tamponamento',
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rotationY = 0,
  ) => {
    if (Math.min(w, h, d) <= 0) return
    boxes.push({
      name,
      size: [w, h, d],
      center: [x - s.W / 2, y + lift, z - s.D / 2],
      rotationY,
      finish: item.joinery?.finishes[part],
      grain: item.joinery?.grain,
    })
  }
  add('Lateral esquerda', 'tamponamento', s.t / 2, s.H / 2, s.D / 2, s.t, s.H, s.D)
  add('Lateral direita', 'tamponamento', s.W - s.t / 2, s.H / 2, s.D / 2, s.t, s.H, s.D)
  add('Tampo', 'tamponamento', s.W / 2, s.H - s.t / 2, s.D / 2, s.W - 2 * s.t, s.t, s.D)
  add('Base', 'corpo', s.W / 2, s.t / 2, s.D / 2, s.W - 2 * s.t, s.t, s.D)
  add(
    'Fundo',
    'corpo',
    s.W / 2,
    s.H / 2,
    rules.back.recessMm + rules.back.thicknessMm / 2,
    s.W - 2 * s.t,
    s.clearHeight,
    rules.back.thicknessMm,
  )
  for (const m of s.modules) {
    if (m.index > 0)
      add('Divisória', 'corpo', m.x0, s.H / 2, (s.D + back) / 2, s.t, s.clearHeight, s.D - back)
    for (const z of m.shelvesZ)
      add(
        `Prateleira ${m.label}`,
        'corpo',
        (m.clearX0 + m.clearX1) / 2,
        z + s.t / 2,
        (back + s.D - rules.shelfFrontSetbackMm) / 2,
        m.clearWidth,
        s.t,
        s.D - back - rules.shelfFrontSetbackMm,
      )
  }
  for (const d of s.doors) {
    const left = d.hinge === 'left'
    const angle = open ? (left ? -Math.PI / 2 : Math.PI / 2) : 0
    const offset = left ? d.w / 2 : -d.w / 2
    const hingeX = left ? d.x : d.x + d.w
    add(
      'Porta',
      'frentes',
      hingeX + offset * Math.cos(angle),
      d.z + d.h / 2,
      s.D + rules.front.thicknessMm / 2 - offset * Math.sin(angle),
      d.w,
      d.h,
      rules.front.thicknessMm,
      angle,
    )
  }
  for (const d of s.drawers)
    add(
      'Frente de gaveta',
      'frentes',
      d.x + d.w / 2,
      d.z + d.h / 2,
      s.D + rules.front.thicknessMm / 2 + (open ? s.D * 0.65 : 0),
      d.w,
      d.h,
      rules.front.thicknessMm,
    )
  if (design.base.kind === 'plinth' && lift > 0) {
    boxes.push({
      name: 'Sóculo',
      center: [0, lift / 2, 0],
      size: [s.W - 2 * s.t, lift, s.D * 0.8],
      finish: item.joinery?.finishes.corpo,
    })
  }
  return boxes
}

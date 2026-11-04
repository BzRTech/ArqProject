import type { Item } from '../project/schema'
import type { SceneBox, Triple } from './model'

/** Furniture in local coordinates, with the head of the bed at the back of the plan symbol. */
export function furnitureBoxes(item: Item, height: number): SceneBox[] {
  const { w, d } = item.sizeMm
  if (!['cama-casal', 'cama-solteiro', 'cama-king'].includes(item.blockId)) {
    return [{ name: item.name, center: [0, height / 2, 0], size: [w, height, d] }]
  }
  const boxes: SceneBox[] = []
  const add = (name: string, center: Triple, size: Triple, color: string, radius: number) => {
    boxes.push({ name, center, size, color, radiusMm: Math.min(radius, ...size.map((n) => n / 2)) })
  }
  const headDepth = d * 0.055
  const bedDepth = d - headDepth
  const bedZ = headDepth / 2
  for (const x of [-w * 0.39, w * 0.39]) {
    for (const z of [-bedDepth * 0.4 + bedZ, bedDepth * 0.4 + bedZ]) {
      add('Pé da cama', [x, height * 0.07, z], [w * 0.05, height * 0.14, d * 0.035], '#514034', 8)
    }
  }
  add(
    'Base estofada',
    [0, height * 0.34, bedZ],
    [w * 0.98, height * 0.42, bedDepth * 0.99],
    '#b5a391',
    28,
  )
  add('Colchão', [0, height * 0.75, bedZ], [w * 0.96, height * 0.4, bedDepth * 0.97], '#eee8df', 42)
  add(
    'Cabeceira estofada',
    [0, height * 0.95, -d / 2 + headDepth / 2],
    [w, height * 1.9, headDepth],
    '#b5a391',
    32,
  )
  // Two upholstered sections on double beds, with a visible central seam.
  const pillowCount = item.blockId === 'cama-solteiro' ? 1 : 2
  const cushionWidth = (w * 0.94) / pillowCount
  for (let i = 0; i < pillowCount; i++) {
    const x = (i - (pillowCount - 1) / 2) * cushionWidth
    add(
      'Painel da cabeceira',
      [x, height * 1.27, -d / 2 + headDepth * 0.85],
      [cushionWidth * 0.98, height * 1.12, headDepth * 0.4],
      '#c4b3a1',
      24,
    )
    add(
      'Travesseiro',
      [x, height * 1.04, -d / 2 + headDepth + bedDepth * 0.145],
      [cushionWidth * 0.83, height * 0.22, bedDepth * 0.22],
      '#f7f3eb',
      50,
    )
  }
  add(
    'Edredom',
    [0, height * 0.99, bedZ + bedDepth * 0.15],
    [w * 0.98, height * 0.09, bedDepth * 0.67],
    '#ddd8ca',
    18,
  )
  add(
    'Dobra do edredom',
    [0, height * 1.035, bedZ - bedDepth * 0.16],
    [w * 0.97, height * 0.07, bedDepth * 0.1],
    '#eee8dc',
    14,
  )
  add(
    'Manta aos pés',
    [0, height * 1.05, bedZ + bedDepth * 0.34],
    [w, height * 0.05, bedDepth * 0.2],
    '#8f9b90',
    10,
  )
  return boxes
}

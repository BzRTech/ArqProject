import type { Item } from '../project/schema'
import type { SceneBox, Triple } from './model'

const WOOD = '#b98d61'
const LINEN = '#c2b5a2'
const WHITE = '#eeeae2'
const METAL = '#444947'
type AddPart = (
  name: string,
  center: Triple,
  size: Triple,
  color: string,
  shape?: SceneBox['shape'],
) => SceneBox
type Model = (add: AddPart, item: Item) => void

function legs(add: AddPart, top: number, color = WOOD) {
  for (const x of [-0.39, 0.39])
    for (const z of [-0.37, 0.37]) {
      add('Pé', [x, top / 2, z], [0.055, top, 0.055], color)
    }
}

const seating: Model = (add, item) => {
  const seats = item.blockId === 'sofa' ? Math.max(2, Math.round(item.sizeMm.w / 700)) : 1
  legs(add, 0.14, METAL)
  add('Estrutura estofada', [0, 0.3, 0], [0.96, 0.32, 0.92], LINEN)
  add('Encosto', [0, 0.72, -0.38], [0.96, 0.56, 0.22], LINEN)
  for (const x of [-0.43, 0.43]) add('Braço', [x, 0.55, 0.06], [0.14, 0.5, 0.86], LINEN)
  for (let i = 0; i < seats; i++) {
    const x = ((i - (seats - 1) / 2) * 0.7) / seats
    add('Almofada do assento', [x, 0.51, 0.09], [0.69 / seats, 0.17, 0.67], '#d9cfbd')
    add('Almofada do encosto', [x, 0.76, -0.23], [0.68 / seats, 0.4, 0.16], '#d9cfbd')
  }
}

const table: Model = (add, item) => {
  const round = ['mesa-redonda', 'mesa-lateral'].includes(item.blockId)
  add('Tampo', [0, 0.965, 0], [1, 0.07, 1], WOOD, round ? 'cylinder' : undefined)
  if (round) {
    add('Pedestal', [0, 0.49, 0], [0.13, 0.91, 0.13], METAL, 'cylinder')
    add('Base circular', [0, 0.025, 0], [0.55, 0.05, 0.55], METAL, 'cylinder')
  } else legs(add, 0.93)
  if (item.blockId === 'escrivaninha') {
    add('Gaveteiro', [0.32, 0.59, -0.02], [0.28, 0.65, 0.82], WHITE)
    for (let i = 0; i < 3; i++) {
      add('Frente da gaveta', [0.32, 0.39 + i * 0.21, 0.4], [0.265, 0.19, 0.025], WHITE)
      add('Puxador', [0.32, 0.42 + i * 0.21, 0.425], [0.1, 0.012, 0.025], METAL)
    }
  }
}

const chair: Model = (add, item) => {
  const office = item.blockId === 'cadeira-escritorio'
  const fabric = office ? METAL : '#8f9b90'
  add('Assento', [0, 0.49, 0.07], [0.82, 0.11, 0.76], fabric)
  add('Encosto', [0, 0.78, -0.35], [0.82, 0.44, 0.16], fabric)
  if (!office) {
    legs(add, 0.44)
    return
  }
  add('Pistão', [0, 0.27, 0], [0.09, 0.34, 0.09], METAL, 'cylinder')
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5
    add(
      'Raio da base',
      [Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2],
      [0.46, 0.035, 0.045],
      METAL,
    ).rotationY = -angle
    add(
      'Rodízio',
      [Math.cos(angle) * 0.4, 0.045, Math.sin(angle) * 0.4],
      [0.09, 0.09, 0.09],
      METAL,
      'ellipsoid',
    )
  }
  for (const x of [-0.43, 0.43]) {
    add('Suporte do braço', [x, 0.55, 0.05], [0.035, 0.25, 0.04], METAL)
    add('Apoio do braço', [x, 0.68, 0.02], [0.11, 0.045, 0.4], fabric)
  }
}

const drawers: Model = (add, item) => {
  legs(add, 0.1)
  add('Caixa', [0, 0.55, -0.025], [0.98, 0.9, 0.93], WOOD)
  const rows = item.blockId === 'criado-mudo' ? 2 : 4
  for (let i = 0; i < rows; i++) {
    const y = 0.14 + ((i + 0.5) * 0.82) / rows
    add('Frente da gaveta', [0, y, 0.465], [0.92, 0.78 / rows, 0.045], WHITE)
    add('Puxador', [0, y + 0.02, 0.495], [0.24, 0.015, 0.01], METAL)
  }
}

const crib: Model = (add) => {
  legs(add, 0.15)
  add('Estrado', [0, 0.31, 0], [0.94, 0.08, 0.92], WOOD)
  add('Colchão', [0, 0.4, 0], [0.85, 0.12, 0.86], WHITE)
  for (const z of [-0.47, 0.47]) add('Cabeceira do berço', [0, 0.56, z], [1, 0.88, 0.06], WHITE)
  for (const x of [-0.46, 0.46]) {
    add('Corrimão', [x, 0.94, 0], [0.06, 0.08, 0.94], WOOD)
    for (let i = 0; i < 10; i++)
      add('Grade', [x, 0.63, -0.41 + (i * 0.82) / 9], [0.025, 0.58, 0.025], WHITE)
  }
}

const rug: Model = (add, item) => {
  const shape = item.blockId === 'tapete-redondo' ? 'cylinder' : undefined
  add('Tapete', [0, 0.4, 0], [1, 0.8, 1], '#c6baaa', shape)
  add('Trama central', [0, 0.85, 0], [0.91, 0.1, 0.91], '#d7cdbc', shape)
}

const plant: Model = (add) => {
  add('Vaso', [0, 0.2, 0], [0.47, 0.4, 0.47], '#b9896c', 'cylinder')
  add('Terra', [0, 0.405, 0], [0.41, 0.02, 0.41], '#514034', 'cylinder')
  add('Caule', [0, 0.64, 0], [0.025, 0.5, 0.025], '#61734b', 'cylinder')
  for (let i = 0; i < 9; i++) {
    const angle = (i * Math.PI * 2) / 9
    add(
      'Folha',
      [Math.cos(angle) * 0.24, 0.68 + (i % 3) * 0.08, Math.sin(angle) * 0.24],
      [0.5, 0.11, 0.21],
      i % 2 ? '#637f52' : '#789765',
      'ellipsoid',
    ).rotationY = -angle
  }
}

const basin: Model = (add) => {
  add('Cuba', [0, 0.5, 0], [1, 0.96, 1], WHITE, 'ellipsoid')
  add('Interior da cuba', [0, 0.89, 0.02], [0.82, 0.12, 0.78], '#b9c2c0', 'ellipsoid')
  add('Ralo', [0, 0.95, 0.02], [0.12, 0.015, 0.12], METAL, 'cylinder')
}

const sinkCounter: Model = (add) => {
  add('Bancada esquerda', [-0.325, 0.97, 0], [0.35, 0.06, 1], WHITE)
  add('Bancada direita', [0.325, 0.97, 0], [0.35, 0.06, 1], WHITE)
  add('Bancada atrás', [0, 0.97, -0.4], [0.3, 0.06, 0.2], WHITE)
  add('Bancada frente', [0, 0.97, 0.4], [0.3, 0.06, 0.2], WHITE)
  add('Fundo da cuba', [0, 0.81, 0], [0.3, 0.04, 0.6], '#9ea8a6')
  for (const x of [-0.145, 0.145])
    add('Lateral da cuba', [x, 0.89, 0], [0.01, 0.16, 0.6], '#bec7c4')
  for (const z of [-0.29, 0.29]) add('Lateral da cuba', [0, 0.89, z], [0.3, 0.16, 0.02], '#bec7c4')
  add('Torneira', [0, 1.1, -0.36], [0.025, 0.26, 0.04], METAL, 'cylinder')
  add('Bica', [0, 1.22, -0.24], [0.025, 0.025, 0.26], METAL)
  add('Gabinete', [0, 0.4, -0.03], [0.98, 0.78, 0.91], WOOD)
  for (const x of [-0.245, 0.245])
    add('Porta do gabinete', [x, 0.42, 0.44], [0.48, 0.73, 0.03], WOOD)
}

const toilet: Model = (add) => {
  add('Base da louça', [0, 0.3, 0.12], [0.63, 0.6, 0.6], WHITE, 'ellipsoid')
  add('Bacia', [0, 0.76, 0.12], [1, 0.48, 0.73], WHITE, 'ellipsoid')
  add('Assento', [0, 0.98, 0.12], [0.95, 0.09, 0.68], '#f9f7f2', 'cylinder')
  add('Abertura', [0, 1.03, 0.13], [0.62, 0.03, 0.46], '#8e9b9c', 'cylinder')
  add('Caixa acoplada', [0, 1.12, -0.34], [0.92, 1.1, 0.3], WHITE)
  add('Tampa da caixa', [0, 1.69, -0.34], [0.96, 0.06, 0.32], WHITE)
  add('Botão', [0, 1.73, -0.34], [0.13, 0.025, 0.07], METAL, 'cylinder')
}

const fridge: Model = (add) => {
  add('Gabinete da geladeira', [0, 0.5, -0.03], [1, 1, 0.94], '#bdc3c0')
  for (const [y, h] of [
    [0.825, 0.34],
    [0.32, 0.64],
  ] as const) {
    add('Porta', [0, y, 0.46], [0.96, h, 0.08], '#d2d8d4')
    add('Puxador', [-0.36, y, 0.505], [0.035, h * 0.55, 0.025], METAL)
  }
}

const cooktop: Model = (add) => {
  add('Vidro do cooktop', [0, 0.5, 0], [1, 0.55, 1], '#222927')
  for (const x of [-0.23, 0.23])
    for (const z of [-0.22, 0.22]) {
      add('Aro do queimador', [x, 0.82, z], [0.28, 0.12, 0.28], '#69716b', 'cylinder')
      add('Queimador', [x, 0.92, z], [0.2, 0.1, 0.2], '#171c1b', 'cylinder')
      add('Grelha', [x, 1, z], [0.34, 0.08, 0.028], METAL)
      add('Grelha', [x, 1, z], [0.028, 0.08, 0.34], METAL)
    }
  for (let i = 0; i < 4; i++)
    add('Botão', [-0.18 + i * 0.12, 0.88, 0.4], [0.06, 0.2, 0.06], METAL, 'cylinder')
}

const washer: Model = (add, item) => {
  add('Gabinete', [0, 0.5, -0.025], [1, 1, 0.95], WHITE)
  add('Painel de controle', [0, 0.91, 0.46], [0.94, 0.14, 0.04], '#d4d9d5')
  add('Seletor', [0.28, 0.91, 0.49], [0.09, 0.08, 0.025], METAL, 'ellipsoid')
  const ratio = item.sizeMm.w / item.sizeMm.d
  add(
    'Aro da porta',
    [0, 0.48, 0.47],
    [0.72, 0.04, 0.72 * ratio],
    '#737c79',
    'cylinder',
  ).rotationX = Math.PI / 2
  add(
    'Vidro da porta',
    [0, 0.48, 0.5],
    [0.57, 0.025, 0.57 * ratio],
    '#34444a',
    'cylinder',
  ).rotationX = Math.PI / 2
}

const shower: Model = (add) => {
  add('Base do box', [0, 0.018, 0], [1, 0.036, 1], WHITE)
  for (const x of [-0.49, 0.49]) {
    add('Vidro lateral', [x, 0.49, 0], [0.012, 0.94, 0.98], '#b4d2cf').opacity = 0.22
    add('Perfil', [x, 0.5, 0.48], [0.022, 0.96, 0.022], METAL)
  }
  add('Vidro frontal', [0, 0.49, 0.48], [0.97, 0.94, 0.012], '#b4d2cf').opacity = 0.2
  add('Puxador do box', [0.15, 0.5, 0.49], [0.02, 0.12, 0.025], METAL)
  add('Coluna do chuveiro', [0, 0.63, -0.45], [0.02, 0.6, 0.02], METAL, 'cylinder')
  add('Braço do chuveiro', [0, 0.92, -0.32], [0.025, 0.025, 0.28], METAL)
  add('Ducha', [0, 0.91, -0.18], [0.22, 0.02, 0.22], METAL, 'cylinder')
}

const tvPanel: Model = (add) => {
  add('Painel de madeira', [0, 0.5, -0.1], [1, 1, 0.8], WOOD)
  add('Friso esquerdo', [-0.44, 0.5, 0.34], [0.015, 0.96, 0.08], '#8b6747')
  add('Friso direito', [0.44, 0.5, 0.34], [0.015, 0.96, 0.08], '#8b6747')
}

const MODELS: Record<string, Model> = {
  sofa: seating,
  poltrona: seating,
  cadeira: chair,
  'cadeira-escritorio': chair,
  'mesa-retangular': table,
  'mesa-redonda': table,
  'mesa-centro': table,
  'mesa-lateral': table,
  escrivaninha: table,
  'criado-mudo': drawers,
  comoda: drawers,
  berco: crib,
  tapete: rug,
  'tapete-redondo': rug,
  'vaso-planta': plant,
  'cuba-apoio': basin,
  'bancada-cuba': sinkCounter,
  'vaso-sanitario': toilet,
  geladeira: fridge,
  cooktop,
  'maquina-lavar': washer,
  'box-chuveiro': shower,
  'painel-tv': tvPanel,
}

export const FURNITURE_HEIGHTS: Readonly<Record<string, number>> = {
  'cuba-apoio': 160,
  'vaso-planta': 1200,
  cooktop: 55,
  'box-chuveiro': 2100,
}

export function catalogFurnitureBoxes(item: Item, height: number): SceneBox[] | undefined {
  const model = Object.hasOwn(MODELS, item.blockId) ? MODELS[item.blockId] : undefined
  if (!model) return undefined
  const dimensions: Triple = [item.sizeMm.w, height, item.sizeMm.d]
  const boxes: SceneBox[] = []
  const add: AddPart = (name, center, size, color, shape) => {
    const sizeMm = size.map((v, i) => v * dimensions[i]!) as Triple
    const box: SceneBox = {
      name,
      center: center.map((v, i) => v * dimensions[i]!) as Triple,
      size: sizeMm,
      color,
      shape,
      radiusMm: shape ? 0 : Math.min(Math.min(...dimensions) * 0.025, ...sizeMm.map((n) => n / 2)),
    }
    boxes.push(box)
    return box
  }
  model(add, item)
  return boxes
}

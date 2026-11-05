import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectSchema, newProject } from '@/core/project/schema'
import { setSegmentLengthLinked } from '@/core/project/wall-edit'
import { clearHistory, newId, redo, selectActiveEnv, undo, useEditor } from './store'

const S = () => useEditor.getState()
const env = () => selectActiveEnv(S())

describe('perspectivas', () => {
  it('renomeia, remove e desfaz preservando a referência ao arquivo', () => {
    const view = { id: 'v1', title: 'Sala', assetId: 'a1', widthPx: 1600, heightPx: 900 }
    S().addPerspective('env-1', view)
    S().openPerspective('env-1', 'v1')
    expect(S().stage).toBe('pranchas')
    expect(S().perspectiveId).toBe('v1')
    S().renamePerspective('v1', '  Vista aberta  ')
    expect(env().perspectives?.[0]?.title).toBe('Vista aberta')
    S().removePerspective('v1')
    expect(env().perspectives).toEqual([])
    undo()
    expect(env().perspectives?.[0]).toEqual({ ...view, title: 'Vista aberta' })
    expect(ProjectSchema.safeParse(S().project).success).toBe(true)
    S().setActiveEnv('env-1')
    expect(S().perspectiveId).toBeNull()
  })
})

beforeEach(() => {
  S().loadProject(newProject('env-1'))
  clearHistory()
})

describe('editor — itens', () => {
  it('cancela um arrasto sem consumir o histórico anterior e retoma o desfazer', () => {
    const id = S().addItem('sofa', { x: 1000, y: 1000 })
    S().select({ kind: 'item', id })
    const before = S().project
    const count = useEditor.temporal.getState().pastStates.length
    S().beginInteraction()
    S().moveSelection(300, 200)
    S().cancelInteraction()
    expect(S().project).toBe(before)
    expect(useEditor.temporal.getState().pastStates).toHaveLength(count)
    expect(useEditor.temporal.getState().isTracking).toBe(true)
    undo()
    expect(env().items).toHaveLength(0)
  })
  it('gera UUIDs também no endereço HTTP da rede local', () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) })
    try {
      const first = newId()
      expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(newId()).not.toBe(first)
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('insere bloco com medidas padrão, seleciona e volta à ferramenta de seleção', () => {
    S().startPlacing('cama-casal')
    const id = S().addItem('cama-casal', { x: 1000.4, y: 2000.6 })
    expect(env().items[0]).toMatchObject({
      id,
      name: 'Cama de casal',
      position: { x: 1000, y: 2001 },
      sizeMm: { w: 1580, d: 2000 },
    })
    expect(S().selection).toEqual({ kind: 'item', id })
    expect(S().tool).toBe('select')
  })

  it('respeita a medida mínima do bloco e arredonda para mm', () => {
    const id = S().addItem('cama-casal', { x: 0, y: 0 })
    S().updateItem(id, { sizeMm: { w: 500.7, d: 2100.2 } })
    expect(env().items[0]!.sizeMm).toEqual({ w: 1200, d: 2100 })
  })

  it('girar, espelhar, duplicar e excluir', () => {
    S().addItem('sofa', { x: 0, y: 0 })
    S().rotateSelection(90)
    S().rotateSelection(-180)
    expect(env().items[0]!.rotationDeg).toBe(270)
    S().mirrorSelection()
    expect(env().items[0]!.mirrored).toBe(true)
    S().duplicateSelection()
    expect(env().items).toHaveLength(2)
    expect(env().items[1]!.position).toEqual({ x: 200, y: 200 })
    S().deleteSelection()
    expect(env().items).toHaveLength(1)
  })

  it('o documento continua válido pelo schema', () => {
    S().addItem('rack', { x: 10, y: 10 })
    S().addWall(
      [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
      ],
      false,
    )
    S().addText({ x: 5, y: 5 }, 'SALA')
    S().addDimension({
      p1: { x: 0, y: 0 },
      p2: { x: 4000, y: 0 },
      orientation: 'horizontal',
      offsetMm: 400,
    })
    expect(ProjectSchema.safeParse(S().project).success).toBe(true)
  })
})

describe('editor — desfazer/refazer', () => {
  it('desfaz e refaz a inserção', () => {
    S().addItem('cadeira', { x: 0, y: 0 })
    expect(env().items).toHaveLength(1)
    undo()
    expect(env().items).toHaveLength(0)
    redo()
    expect(env().items).toHaveLength(1)
  })

  it('mudar ferramenta ou seleção não cria passo de desfazer', () => {
    S().addItem('cadeira', { x: 0, y: 0 })
    const steps = useEditor.temporal.getState().pastStates.length
    S().setTool('wall')
    S().select(null)
    expect(useEditor.temporal.getState().pastStates.length).toBe(steps)
  })

  it('um arrasto inteiro é um único passo', () => {
    S().addItem('cadeira', { x: 0, y: 0 })
    const steps = useEditor.temporal.getState().pastStates.length
    S().beginInteraction()
    for (let i = 0; i < 10; i++) S().moveSelection(10, 5)
    S().endInteraction()
    expect(env().items[0]!.position).toEqual({ x: 100, y: 50 })
    expect(useEditor.temporal.getState().pastStates.length).toBe(steps + 1)
    undo()
    expect(env().items[0]!.position).toEqual({ x: 0, y: 0 })
  })
})

describe('editor — ambientes', () => {
  it('cria, renomeia e troca de ambiente; itens ficam no ambiente certo', () => {
    S().addItem('cadeira', { x: 0, y: 0 })
    const sala = S().addEnvironment('Sala')
    expect(S().activeEnvId).toBe(sala)
    expect(env().items).toHaveLength(0)
    S().renameEnvironment(sala, 'Sala de estar')
    expect(env().name).toBe('Sala de estar')
    S().setActiveEnv('env-1')
    expect(env().items).toHaveLength(1)
  })
})

describe('editor — ambiente retangular, esquadrias e cotas', () => {
  it('ambiente retangular pelas medidas internas: eixo afastado meia espessura', () => {
    S().setRoomSize({ w: 4400, d: 3800 })
    S().setWallThickness(150)
    S().addRoom({ x: 0, y: 0 })
    const wall = env().drawings[0]!
    expect(wall).toMatchObject({
      kind: 'wall',
      closed: true,
      thicknessMm: 150,
      points: [
        { x: -75, y: -75 },
        { x: 4475, y: -75 },
        { x: 4475, y: 3875 },
        { x: -75, y: 3875 },
      ],
    })
    expect(S().tool).toBe('select')
  })

  it('porta: inserir, inverter lado e dobradiça, e sumir junto com a parede', () => {
    const wallId = S().addWall(
      [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
      ],
      false,
    )
    const id = S().addOpening({
      type: 'porta-abrir',
      wallId,
      segment: 0,
      offsetMm: 1000,
      side: 'right',
    })
    expect(env().openings[0]).toMatchObject({
      id,
      widthMm: 800,
      heightMm: 2100,
      hinge: 'start',
      side: 'right',
    })
    expect(S().selection).toEqual({ kind: 'opening', id })
    S().rotateSelection(90)
    S().mirrorSelection()
    expect(env().openings[0]).toMatchObject({ side: 'left', hinge: 'end' })
    S().updateOpening(id, { widthMm: 120 })
    expect(env().openings[0]!.widthMm).toBe(300) // largura mínima
    S().select({ kind: 'drawing', id: wallId })
    S().deleteSelection()
    expect(env().openings).toHaveLength(0)
    undo()
    expect(env().openings).toHaveLength(1)
  })

  it('cadeias de cota entram como desenho e se movem juntas', () => {
    S().addChains([
      {
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
        ],
        orientation: 'horizontal',
        offsetMm: 500,
        total: false,
      },
    ])
    const chain = env().drawings[0]!
    S().select({ kind: 'drawing', id: chain.id })
    S().moveSelection(10, 20)
    expect(env().drawings[0]).toMatchObject({
      kind: 'chain',
      points: [
        { x: 10, y: 20 },
        { x: 1010, y: 20 },
      ],
    })
  })
})

describe('editor — legenda, orçamento e área', () => {
  it('item novo nasce com padrões de legenda; preço e quantidade são saneados', () => {
    const id = S().addItem('cadeira', { x: 0, y: 0 })
    expect(env().items[0]).toMatchObject({
      qty: 1,
      unit: 'un',
      showMarker: true,
      inLegend: true,
      existing: false,
      approved: false,
    })
    S().updateItem(id, { qty: 2.555, unitPriceCents: 45990.4 })
    expect(env().items[0]).toMatchObject({ qty: 2.56, unitPriceCents: 45990 })
    S().updateItem(id, { qty: -3 })
    expect(env().items[0]!.qty).toBe(1)
  })

  it('área entra selecionada e se move com o arrasto', () => {
    const id = S().addArea(
      [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 1000 },
      ],
      'Sala',
    )
    expect(S().selection).toEqual({ kind: 'drawing', id })
    S().moveSelection(10, 0)
    expect(env().drawings[0]).toMatchObject({
      kind: 'area',
      name: 'Sala',
      points: [
        { x: 10, y: 0 },
        { x: 1010, y: 0 },
        { x: 1010, y: 1000 },
      ],
    })
    expect(ProjectSchema.safeParse(S().project).success).toBe(true)
  })
})

describe('editor — seleção múltipla', () => {
  it('selectMany, Shift alterna e exclusão em grupo num único passo de desfazer', () => {
    const a = S().addItem('sofa', { x: 0, y: 0 })
    const b = S().addItem('sofa', { x: 3000, y: 0 })
    const t = S().addText({ x: 500, y: 500 }, 'nota')
    S().selectMany([{ kind: 'item', id: a }])
    expect(S().selection).toEqual({ kind: 'item', id: a })
    S().selectMany(
      [
        { kind: 'item', id: b },
        { kind: 'item', id: a },
      ],
      true,
    )
    expect(S().selected).toHaveLength(2) // sem duplicar
    expect(S().selection).toBeNull()
    S().toggleSelect({ kind: 'drawing', id: t })
    expect(S().selected).toHaveLength(3)
    S().toggleSelect({ kind: 'item', id: a })
    expect(S().selected.map((r) => r.id)).toEqual([b, t])
    S().deleteSelection()
    expect(env().items.map((i) => i.id)).toEqual([a])
    expect(env().drawings).toHaveLength(0)
    expect(S().selected).toEqual([])
    undo()
    expect(env().items).toHaveLength(2)
    expect(env().drawings).toHaveLength(1)
  })

  it('excluir uma parede leva as esquadrias dela; mover o grupo desloca todos', () => {
    const w = S().addWall(
      [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
      ],
      false,
    )
    S().addOpening({ wallId: w, type: 'janela-correr-2', segment: 0, offsetMm: 1000, side: 'left' })
    const i = S().addItem('sofa', { x: 1000, y: 1000 })
    S().selectMany([
      { kind: 'drawing', id: w },
      { kind: 'item', id: i },
    ])
    S().moveSelection(100, -50)
    expect(env().items[0]!.position).toEqual({ x: 1100, y: 950 })
    const wall = env().drawings[0] as { points: { x: number; y: number }[] }
    expect(wall.points[0]).toEqual({ x: 100, y: -50 })
    S().deleteSelection()
    expect(env().drawings).toHaveLength(0)
    expect(env().openings).toHaveLength(0)
    expect(env().items).toHaveLength(0)
  })
})

describe('editor — cotas ligadas', () => {
  it('Cotar parede cria externas + área útil que acompanham a parede; desfazer volta tudo junto', () => {
    const w = S().addRoom({ x: 0, y: 0 })
    S().addWallDims(w)
    const dims = () => env().drawings.filter((d) => d.kind === 'chain' || d.kind === 'dimension')
    expect(dims().filter((d) => d.kind === 'chain')).toHaveLength(4)
    expect(dims().filter((d) => d.kind === 'dimension')).toHaveLength(2)
    const inner = () =>
      dims().find(
        (d) => d.kind === 'dimension' && d.ref?.kind === 'wall-inner' && d.ref.segment === 0,
      )
    const before = JSON.stringify(inner())
    S().editWalls((ws) => setSegmentLengthLinked(ws, w, 0, 5000))
    expect(JSON.stringify(inner())).not.toBe(before)
    undo()
    expect(JSON.stringify(inner())).toBe(before)
    // cotar de novo não duplica
    S().addWallDims(w)
    expect(dims()).toHaveLength(6)
  })

  it('Cotar posição do móvel; mover o móvel move as cotas; apagar o móvel apaga as cotas', () => {
    const w = S().addRoom({ x: 0, y: 0 })
    const ww = env().drawings.find((d) => d.id === w)!
    expect(ww.kind).toBe('wall')
    const it = S().addItem('criado-mudo', { x: 1000, y: 1000 })
    S().addItemDims([it])
    const itemDims = () =>
      env().drawings.filter((d) => d.kind === 'dimension' && d.ref?.kind === 'item')
    expect(itemDims()).toHaveLength(4)
    const snap = JSON.stringify(itemDims())
    S().select({ kind: 'item', id: it })
    S().moveSelection(100, 0)
    expect(JSON.stringify(itemDims())).not.toBe(snap)
    S().deleteSelection()
    expect(itemDims()).toHaveLength(0)
  })
})

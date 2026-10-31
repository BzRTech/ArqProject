import { beforeEach, describe, expect, it } from 'vitest'
import { ProjectSchema, newProject } from '@/core/project/schema'
import { clearHistory, redo, selectActiveEnv, undo, useEditor } from './store'

const S = () => useEditor.getState()
const env = () => selectActiveEnv(S())

beforeEach(() => {
  S().loadProject(newProject('env-1'))
  clearHistory()
})

describe('editor — itens', () => {
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

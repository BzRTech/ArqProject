import { current } from 'immer'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { getBlock } from '@/core/blocks/catalog'
import type { Vec2 } from '@/core/geometry/vec'
import {
  newEnvironment,
  newProject,
  type BasePlan,
  type Drawing,
  type Environment,
  type Item,
  type Project,
} from '@/core/project/schema'
import { roundMm } from '@/core/units'

export type Tool = 'select' | 'wall' | 'dimension' | 'text' | 'place' | 'calibrate'
export type Selection = { kind: 'item' | 'drawing'; id: string } | null

export const newId = (): string => crypto.randomUUID()
const rp = (p: Vec2): Vec2 => ({ x: roundMm(p.x), y: roundMm(p.y) })

export interface EditorState {
  project: Project
  activeEnvId: string
  selection: Selection
  tool: Tool
  placeBlockId: string | null
  wallThicknessMm: number
  /** Pontos marcados na calibração da planta base. */
  calibration: Vec2[]

  // --- UI (não entra no histórico)
  setTool: (tool: Tool) => void
  startPlacing: (blockId: string) => void
  select: (sel: Selection) => void
  setWallThickness: (mm: number) => void
  setCalibration: (pts: Vec2[]) => void
  setActiveEnv: (id: string) => void

  // --- Documento
  loadProject: (p: Project) => void
  renameProject: (name: string) => void
  addEnvironment: (name?: string) => string
  renameEnvironment: (id: string, name: string) => void
  removeEnvironment: (id: string) => void
  addItem: (blockId: string, position: Vec2) => string
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void
  addWall: (points: Vec2[], closed: boolean) => string
  addDimension: (d: Omit<Extract<Drawing, { kind: 'dimension' }>, 'id' | 'kind'>) => string
  addText: (at: Vec2, text?: string) => string
  updateDrawing: (id: string, patch: Partial<Drawing>) => void
  moveSelection: (dx: number, dy: number) => void
  rotateSelection: (deg: number) => void
  mirrorSelection: () => void
  duplicateSelection: () => void
  deleteSelection: () => void
  setBasePlan: (bp: BasePlan | null) => void
  updateBasePlan: (patch: Partial<BasePlan>) => void

  /** Agrupa várias mudanças (arrasto) em um único passo de desfazer. */
  beginInteraction: () => void
  endInteraction: () => void
}

function initialState() {
  const envId = newId()
  return { project: newProject(envId), activeEnvId: envId }
}

let interactionSnapshot: Project | null = null

export const useEditor = create<EditorState>()(
  temporal(
    immer((set, get) => {
      const env = (s: EditorState): Environment =>
        s.project.environments.find((e) => e.id === s.activeEnvId) ?? s.project.environments[0]!

      return {
        ...initialState(),
        selection: null,
        tool: 'select',
        placeBlockId: null,
        wallThicknessMm: 150,
        calibration: [],

        setTool: (tool) =>
          set((s) => {
            s.tool = tool
            s.placeBlockId = tool === 'place' ? s.placeBlockId : null
            s.calibration = []
          }),
        startPlacing: (blockId) =>
          set((s) => {
            s.tool = 'place'
            s.placeBlockId = blockId
            s.selection = null
          }),
        select: (sel) => set((s) => void (s.selection = sel)),
        setWallThickness: (mm) => set((s) => void (s.wallThicknessMm = Math.max(10, roundMm(mm)))),
        setCalibration: (pts) => set((s) => void (s.calibration = pts.map(rp))),
        setActiveEnv: (id) =>
          set((s) => {
            s.activeEnvId = id
            s.selection = null
          }),

        loadProject: (p) =>
          set((s) => {
            s.project = p
            s.activeEnvId = p.environments[0]!.id
            s.selection = null
          }),
        renameProject: (name) => set((s) => void (s.project.name = name.trim() || s.project.name)),
        addEnvironment: (name) => {
          const id = newId()
          set((s) => {
            s.project.environments.push(
              newEnvironment(id, name ?? `Ambiente ${s.project.environments.length + 1}`),
            )
            s.activeEnvId = id
            s.selection = null
          })
          return id
        },
        renameEnvironment: (id, name) =>
          set((s) => {
            const e = s.project.environments.find((x) => x.id === id)
            if (e && name.trim()) e.name = name.trim()
          }),
        removeEnvironment: (id) =>
          set((s) => {
            if (s.project.environments.length <= 1) return
            s.project.environments = s.project.environments.filter((e) => e.id !== id)
            if (s.activeEnvId === id) s.activeEnvId = s.project.environments[0]!.id
            s.selection = null
          }),

        addItem: (blockId, position) => {
          const block = getBlock(blockId)
          const id = newId()
          set((s) => {
            const { w, d, h } = block.defaultSize
            env(s).items.push({
              id,
              blockId,
              blockVersion: block.version,
              name: block.name,
              position: rp(position),
              rotationDeg: 0,
              mirrored: false,
              sizeMm: h ? { w, d, h } : { w, d },
            })
            s.selection = { kind: 'item', id }
            s.tool = 'select'
            s.placeBlockId = null
          })
          return id
        },
        updateItem: (id, patch) =>
          set((s) => {
            const it = env(s).items.find((i) => i.id === id)
            if (!it) return
            Object.assign(it, patch)
            it.position = rp(it.position)
            const min = getBlock(it.blockId).minSize
            it.sizeMm.w = Math.max(min.w, roundMm(it.sizeMm.w))
            it.sizeMm.d = Math.max(min.d, roundMm(it.sizeMm.d))
            it.rotationDeg = ((it.rotationDeg % 360) + 360) % 360
          }),
        addWall: (points, closed) => {
          const id = newId()
          set((s) => {
            env(s).drawings.push({
              id,
              kind: 'wall',
              points: points.map(rp),
              closed,
              thicknessMm: s.wallThicknessMm,
            })
          })
          return id
        },
        addDimension: (d) => {
          const id = newId()
          set((s) => {
            env(s).drawings.push({
              ...d,
              id,
              kind: 'dimension',
              p1: rp(d.p1),
              p2: rp(d.p2),
              offsetMm: roundMm(d.offsetMm),
            })
            s.tool = 'dimension'
          })
          return id
        },
        addText: (at, text = 'Texto') => {
          const id = newId()
          set((s) => {
            env(s).drawings.push({ id, kind: 'text', at: rp(at), text, sizeMm: 3 })
            s.selection = { kind: 'drawing', id }
            s.tool = 'select'
          })
          return id
        },
        updateDrawing: (id, patch) =>
          set((s) => {
            const d = env(s).drawings.find((x) => x.id === id)
            if (d) Object.assign(d, patch)
          }),

        moveSelection: (dx, dy) =>
          set((s) => {
            const sel = s.selection
            if (!sel || (dx === 0 && dy === 0)) return
            const mv = (p: Vec2) => rp({ x: p.x + dx, y: p.y + dy })
            if (sel.kind === 'item') {
              const it = env(s).items.find((i) => i.id === sel.id)
              if (it) it.position = mv(it.position)
              return
            }
            const d = env(s).drawings.find((x) => x.id === sel.id)
            if (!d) return
            if (d.kind === 'wall') d.points = d.points.map(mv)
            else if (d.kind === 'dimension') {
              d.p1 = mv(d.p1)
              d.p2 = mv(d.p2)
            } else d.at = mv(d.at)
          }),
        rotateSelection: (deg) => {
          const sel = get().selection
          if (sel?.kind !== 'item') return
          const it = env(get()).items.find((i) => i.id === sel.id)
          if (it) get().updateItem(sel.id, { rotationDeg: it.rotationDeg + deg })
        },
        mirrorSelection: () =>
          set((s) => {
            const sel = s.selection
            if (sel?.kind !== 'item') return
            const it = env(s).items.find((i) => i.id === sel.id)
            if (it) it.mirrored = !it.mirrored
          }),
        duplicateSelection: () =>
          set((s) => {
            const sel = s.selection
            if (!sel) return
            const id = newId()
            const offset = (p: Vec2) => ({ x: p.x + 200, y: p.y + 200 })
            if (sel.kind === 'item') {
              const it = env(s).items.find((i) => i.id === sel.id)
              if (!it) return
              env(s).items.push({
                ...structuredClone(current(it)),
                id,
                position: offset(it.position),
              })
            } else {
              const d = env(s).drawings.find((x) => x.id === sel.id)
              if (!d) return
              const copy = { ...structuredClone(current(d)), id }
              if (copy.kind === 'wall') copy.points = copy.points.map(offset)
              else if (copy.kind === 'dimension') {
                copy.p1 = offset(copy.p1)
                copy.p2 = offset(copy.p2)
              } else copy.at = offset(copy.at)
              env(s).drawings.push(copy)
            }
            s.selection = { kind: sel.kind, id }
          }),
        deleteSelection: () =>
          set((s) => {
            const sel = s.selection
            if (!sel) return
            const e = env(s)
            if (sel.kind === 'item') e.items = e.items.filter((i) => i.id !== sel.id)
            else e.drawings = e.drawings.filter((d) => d.id !== sel.id)
            s.selection = null
          }),
        setBasePlan: (bp) => set((s) => void (env(s).basePlan = bp)),
        updateBasePlan: (patch) =>
          set((s) => {
            const bp = env(s).basePlan
            if (bp) Object.assign(bp, patch)
          }),

        beginInteraction: () => {
          interactionSnapshot = get().project
          useEditor.temporal.getState().pause()
        },
        endInteraction: () => {
          const snapshot = interactionSnapshot
          interactionSnapshot = null
          const temporalState = useEditor.temporal.getState()
          const final = get().project
          if (!snapshot || snapshot === final) {
            temporalState.resume()
            return
          }
          // Volta ao estado inicial sem registrar e aplica o final com o histórico ligado:
          // o arrasto inteiro vira um passo só.
          set((s) => void (s.project = snapshot))
          temporalState.resume()
          set((s) => void (s.project = final))
        },
      }
    }),
    {
      partialize: (s) => ({ project: s.project }),
      equality: (a, b) => a.project === b.project,
      limit: 200,
    },
  ),
)

/** Ambiente ativo (seletor para componentes). */
export const selectActiveEnv = (s: EditorState): Environment =>
  s.project.environments.find((e) => e.id === s.activeEnvId) ?? s.project.environments[0]!

export const undo = () => useEditor.temporal.getState().undo()
export const redo = () => useEditor.temporal.getState().redo()
export const clearHistory = () => useEditor.temporal.getState().clear()

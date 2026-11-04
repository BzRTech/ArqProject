import { current } from 'immer'
import { COLUMN_DEFAULTS } from '@/core/project/columns'
import { innerFacePolygon } from '@/core/project/areas'
import { defaultDesign, designFromPreset } from '@/core/joinery/sheet'
import { STAGES, STAGE_TOOLS, type Stage } from '@/core/editor/stages'
import { createItemDims, createWallDims, syncLinkedDims } from '@/core/project/linked-dims'
import { temporal } from 'zundo'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { getBlock, registerSnapshot, setSnapshots } from '@/core/blocks/catalog'
import type { BlockDef } from '@/core/blocks/types'
import type { RuleProfile } from '@/core/joinery/rules'
import type { JoineryPresetDef, SheetTemplateDef } from '@/core/library/schemas'
import { applyBlockUpdate, applyRules, snapshotBlock } from '@/core/library/updates'
import { useLibrary } from '@/features/library/library-store'
import type { Vec2 } from '@/core/geometry/vec'
import { openingDef } from '@/core/project/openings'
import { reattachOpenings } from '@/core/project/wall-edit'
import {
  type JoineryDesign,
  ITEM_DEFAULTS,
  newEnvironment,
  newProject,
  type BasePlan,
  type ChainDrawing,
  type Drawing,
  type Environment,
  type Item,
  type Opening,
  type OpeningType,
  type Project,
  type SheetSetup,
  type Wall,
} from '@/core/project/schema'
import { roundMm } from '@/core/units'

export type Tool =
  | 'select'
  | 'wall'
  | 'room'
  | 'area'
  | 'dimension'
  | 'text'
  | 'column'
  | 'place'
  | 'opening'
  | 'calibrate'
export type Selection = { kind: 'item' | 'drawing' | 'opening'; id: string } | null
export type SelRef = NonNullable<Selection>

export const newId = (): string => crypto.randomUUID()

/** Tipo de móvel do bloco (banco em uso), para os padrões do detalhamento. */
function joineryTypeOf(it: Pick<Item, 'blockId' | 'blockVersion'>) {
  const type = getBlock(it.blockId, it.blockVersion).joineryType
  return type ? useLibrary.getState().lib['joinery-types'].find((t) => t.id === type) : undefined
}
const rp = (p: Vec2): Vec2 => ({ x: roundMm(p.x), y: roundMm(p.y) })

export interface EditorState {
  project: Project
  activeEnvId: string
  /** Objeto principal (alimenta o painel); null quando há vários selecionados. */
  selection: Selection
  /** Tudo o que está selecionado (1 ou vários). */
  selected: SelRef[]
  tool: Tool
  /** Aba de trabalho do ambiente (Planta, Layout, Piso, Marcenaria, Pranchas). */
  stage: Stage
  /** Móvel de marcenaria aberto no detalhamento (vistas no lugar da planta). */
  detailItemId: string | null
  /** Abre o detalhamento (cria o desenho inicial se o móvel ainda não tiver). */
  openDetail: (itemId: string) => void
  closeDetail: () => void
  /** Troca o desenho (módulos, base, puxador) do móvel. */
  setJoineryDesign: (itemId: string, design: JoineryDesign) => void
  /** Troca o desenho do móvel pelo de um modelo pronto do banco. */
  applyPreset: (itemId: string, preset: JoineryPresetDef) => void
  /** "Atualizar do banco": itens do bloco passam para a versão nova (o desenho muda). */
  updateBlockFromBank: (def: BlockDef) => void
  /** "Atualizar do banco": regras de marcenaria do escritório no projeto. */
  updateRulesFromBank: (rules: RuleProfile) => void
  /** Folha da prancha do ambiente (undefined = a do modelo do projeto). */
  setEnvSheet: (envId: string, sheet: SheetSetup | undefined) => void
  /** Modelo de folha do projeto (cópia do banco: tamanho, orientação, margem, notas). */
  setSheetTemplate: (t: SheetTemplateDef) => void
  setStage: (stage: Stage) => void
  /** Cria a área de cada parede fechada que ainda não tem (pelas faces internas). */
  addAreasFromWalls: () => void
  placeBlockId: string | null
  placeOpeningType: OpeningType | null
  wallThicknessMm: number
  /** Medidas INTERNAS da ferramenta "ambiente retangular". */
  roomSize: { w: number; d: number }
  /** Pontos marcados na calibração da planta base. */
  calibration: Vec2[]

  // --- UI (não entra no histórico)
  setTool: (tool: Tool) => void
  startPlacing: (blockId: string) => void
  startOpening: (type: OpeningType) => void
  setRoomSize: (size: { w: number; d: number }) => void
  select: (sel: Selection) => void
  /** Seleção múltipla (janela, Ctrl+A); `add` soma à atual (Shift). */
  selectMany: (refs: SelRef[], add?: boolean) => void
  /** Shift+clique: põe ou tira um objeto da seleção. */
  toggleSelect: (ref: SelRef) => void
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
  /** Pilar centrado em `at` (continua na ferramenta para inserir outros). */
  addColumn: (at: Vec2, rotationDeg?: number) => string
  addArea: (points: Vec2[], name?: string) => string
  addChains: (chains: Omit<ChainDrawing, 'id' | 'kind'>[]) => void
  /** Cotas ligadas da parede: externas com os vãos + medidas internas (substitui as antigas). */
  addWallDims: (wallId: string) => void
  /** Cotas ligadas da posição dos móveis até as paredes (substitui as antigas). */
  addItemDims: (itemIds: string[]) => void
  /** Ambiente retangular pelas medidas INTERNAS; `corner` = canto interno superior esquerdo. */
  addRoom: (corner: Vec2) => string
  addOpening: (o: Omit<Opening, 'id' | 'widthMm' | 'heightMm' | 'sillMm' | 'hinge'>) => string
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id'>>) => void
  updateDrawing: (id: string, patch: Partial<Drawing>) => void
  /** Aplica uma edição de geometria à parede e reencaixa as portas/janelas dela. */
  editWall: (wallId: string, fn: (w: Wall) => Wall) => void
  /** Edição que pode mexer em várias paredes (paredes encostadas acompanham). */
  editWalls: (fn: (walls: Wall[]) => Wall[]) => void
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

/** Única forma de mudar a seleção simples: mantém `selection` e `selected` em sincronia. */
function setSel(s: { selection: Selection; selected: SelRef[] }, sel: Selection) {
  s.selection = sel
  s.selected = sel ? [sel] : []
}

export const useEditor = create<EditorState>()(
  temporal(
    immer((rawSet, get) => {
      /** Toda mudança recalcula as cotas ligadas no MESMO passo (desfazer volta tudo junto). */
      const set = (fn: (s: EditorState) => void) =>
        rawSet((s) => {
          fn(s)
          for (const e of s.project.environments) {
            const next = syncLinkedDims(e)
            if (next !== e.drawings) e.drawings = next
          }
        })
      const env = (s: EditorState): Environment =>
        s.project.environments.find((e) => e.id === s.activeEnvId) ?? s.project.environments[0]!

      return {
        ...initialState(),
        selection: null,
        selected: [],
        tool: 'select',
        stage: 'planta',
        detailItemId: null,
        placeBlockId: null,
        placeOpeningType: null,
        wallThicknessMm: 150,
        roomSize: { w: 3000, d: 3000 },
        calibration: [],

        openDetail: (itemId) =>
          set((s) => {
            const it = env(s).items.find((i) => i.id === itemId)
            if (!it) return
            const j = it.joinery ?? { finishes: {}, grain: 'vertical' as const }
            if (!j.design) it.joinery = { ...j, design: defaultDesign(it, joineryTypeOf(it)) }
            s.detailItemId = itemId
            setSel(s, { kind: 'item', id: itemId })
          }),
        closeDetail: () => set((s) => void (s.detailItemId = null)),
        applyPreset: (itemId, preset) =>
          set((s) => {
            const it = env(s).items.find((i) => i.id === itemId)
            if (!it) return
            const j = it.joinery ?? { finishes: {}, grain: 'vertical' as const }
            it.joinery = { ...j, design: designFromPreset(it, preset) }
          }),
        updateBlockFromBank: (def) => {
          registerSnapshot(def)
          set((s) => void applyBlockUpdate(s.project, def))
        },
        updateRulesFromBank: (rules) => set((s) => applyRules(s.project, rules)),
        setEnvSheet: (envId, sheet) =>
          set((s) => {
            const e = s.project.environments.find((x) => x.id === envId)
            if (!e) return
            if (sheet) e.sheet = sheet
            else delete e.sheet
          }),
        setSheetTemplate: (t) => set((s) => void (s.project.librarySnapshots.sheetTemplate = t)),
        setJoineryDesign: (itemId, design) =>
          set((s) => {
            const it = env(s).items.find((i) => i.id === itemId)
            if (!it) return
            const j = it.joinery ?? { finishes: {}, grain: 'vertical' as const }
            it.joinery = {
              ...j,
              design: {
                ...design,
                heightMm: Math.max(100, roundMm(design.heightMm)),
                base: { ...design.base, heightMm: Math.max(0, roundMm(design.base.heightMm)) },
                modules: design.modules.map((m) => ({
                  ...m,
                  widthMm: Math.max(1, roundMm(m.widthMm)),
                })),
              },
            }
          }),
        setStage: (stage) =>
          set((s) => {
            s.stage = stage
            s.detailItemId = null
            s.tool = 'select'
            s.placeBlockId = null
            s.placeOpeningType = null
            s.calibration = []
            setSel(s, null)
          }),
        addAreasFromWalls: () =>
          set((s) => {
            const e = env(s)
            const areas = e.drawings.filter((d) => d.kind === 'area')
            const samePoly = (a: Vec2[], b: Vec2[]) =>
              a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y)
            let n = areas.length
            let first: string | null = null
            for (const w of e.drawings.filter((d): d is Wall => d.kind === 'wall')) {
              const poly = innerFacePolygon(w)
              if (!poly || areas.some((a) => a.kind === 'area' && samePoly(a.points, poly)))
                continue
              const id = newId()
              e.drawings.push({
                id,
                kind: 'area',
                points: poly,
                name: n ? `${e.name} ${n + 1}` : e.name,
              })
              n++
              first ??= id
            }
            if (first) setSel(s, { kind: 'drawing', id: first })
          }),
        setTool: (tool) =>
          set((s) => {
            // Atalho de uma ferramenta de outra aba (W na aba Layout…): vai para a aba dela.
            if (
              !STAGE_TOOLS[s.stage].includes(tool) &&
              !['select', 'place', 'calibrate'].includes(tool)
            ) {
              const home =
                tool === 'opening' ? 'planta' : STAGES.find((st) => STAGE_TOOLS[st].includes(tool))
              if (home && home !== s.stage) {
                s.stage = home
                setSel(s, null)
              }
            }
            s.tool = tool
            s.placeBlockId = tool === 'place' ? s.placeBlockId : null
            s.placeOpeningType = tool === 'opening' ? s.placeOpeningType : null
            s.calibration = []
          }),
        startPlacing: (blockId) =>
          set((s) => {
            s.tool = 'place'
            s.placeBlockId = blockId
            setSel(s, null)
          }),
        startOpening: (type) =>
          set((s) => {
            s.tool = 'opening'
            s.placeOpeningType = type
            setSel(s, null)
          }),
        setRoomSize: (size) =>
          set((s) => {
            s.roomSize = { w: Math.max(300, roundMm(size.w)), d: Math.max(300, roundMm(size.d)) }
          }),
        select: (sel) => set((s) => void setSel(s, sel)),
        selectMany: (refs, add) =>
          set((s) => {
            const key = (r: SelRef) => `${r.kind}:${r.id}`
            const all = add ? [...s.selected, ...refs] : refs
            const uniq = [...new Map(all.map((r) => [key(r), r])).values()]
            s.selected = uniq
            s.selection = uniq.length === 1 ? uniq[0]! : null
          }),
        toggleSelect: (ref) =>
          set((s) => {
            const has = s.selected.some((r) => r.kind === ref.kind && r.id === ref.id)
            const next = has
              ? s.selected.filter((r) => !(r.kind === ref.kind && r.id === ref.id))
              : [...s.selected, ref]
            s.selected = next
            s.selection = next.length === 1 ? next[0]! : null
          }),
        setWallThickness: (mm) => set((s) => void (s.wallThicknessMm = Math.max(10, roundMm(mm)))),
        setCalibration: (pts) => set((s) => void (s.calibration = pts.map(rp))),
        setActiveEnv: (id) =>
          set((s) => {
            s.activeEnvId = id
            s.detailItemId = null
            setSel(s, null)
          }),

        loadProject: (p) =>
          set((s) => {
            setSnapshots(Object.values(p.librarySnapshots.blocks))
            s.project = p
            s.activeEnvId = p.environments[0]!.id
            setSel(s, null)
          }),
        renameProject: (name) => set((s) => void (s.project.name = name.trim() || s.project.name)),
        addEnvironment: (name) => {
          const id = newId()
          set((s) => {
            s.project.environments.push(
              newEnvironment(id, name ?? `Ambiente ${s.project.environments.length + 1}`),
            )
            s.activeEnvId = id
            setSel(s, null)
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
            setSel(s, null)
          }),

        addItem: (blockId, position) => {
          // A versão mais nova (banco do escritório, ou embutida) e a cópia vai para o projeto.
          const block = getBlock(blockId)
          registerSnapshot(block)
          const id = newId()
          set((s) => {
            snapshotBlock(s.project, block)
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
              ...ITEM_DEFAULTS,
              ...(block.refPriceCents !== undefined ? { unitPriceCents: block.refPriceCents } : {}),
            })
            setSel(s, { kind: 'item', id })
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
            const min = getBlock(it.blockId, it.blockVersion).minSize
            it.sizeMm.w = Math.max(min.w, roundMm(it.sizeMm.w))
            it.sizeMm.d = Math.max(min.d, roundMm(it.sizeMm.d))
            it.rotationDeg = ((it.rotationDeg % 360) + 360) % 360
            if (!(it.qty > 0)) it.qty = 1
            it.qty = Math.round(it.qty * 100) / 100
            if (it.unitPriceCents !== undefined)
              it.unitPriceCents = Math.max(0, Math.round(it.unitPriceCents))
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
            setSel(s, { kind: 'drawing', id })
            s.tool = 'select'
          })
          return id
        },
        addColumn: (at, rotationDeg = 0) => {
          const id = newId()
          set((s) => {
            env(s).drawings.push({
              id,
              kind: 'column',
              ...COLUMN_DEFAULTS,
              at: rp(at),
              rotationDeg: Math.round(rotationDeg * 100) / 100,
            })
            setSel(s, { kind: 'drawing', id })
          })
          return id
        },
        addArea: (points, name = '') => {
          const id = newId()
          set((s) => {
            env(s).drawings.push({ id, kind: 'area', points: points.map(rp), name })
            setSel(s, { kind: 'drawing', id })
            s.tool = 'select'
          })
          return id
        },
        addWallDims: (wallId) =>
          set((s) => {
            const e = env(s)
            e.drawings = e.drawings.filter(
              (d) =>
                !(
                  (d.kind === 'chain' || d.kind === 'dimension') &&
                  d.ref &&
                  d.ref.kind !== 'item' &&
                  d.ref.wallId === wallId
                ),
            )
            e.drawings.push(...createWallDims(e, wallId, newId))
          }),
        addItemDims: (itemIds) =>
          set((s) => {
            const e = env(s)
            const ids = new Set(itemIds)
            e.drawings = e.drawings.filter(
              (d) => !(d.kind === 'dimension' && d.ref?.kind === 'item' && ids.has(d.ref.itemId)),
            )
            for (const id of itemIds) e.drawings.push(...createItemDims(e, id, newId))
          }),
        addChains: (chains) =>
          set((s) => {
            for (const c of chains) {
              env(s).drawings.push({
                ...c,
                id: newId(),
                kind: 'chain',
                points: c.points.map(rp),
                offsetMm: roundMm(c.offsetMm),
              })
            }
          }),
        addRoom: (corner) => {
          const id = newId()
          set((s) => {
            const h = s.wallThicknessMm / 2
            const { w, d } = s.roomSize
            const c = rp(corner)
            // Eixo afastado meia espessura para fora: as faces internas medem w × d.
            const x0 = c.x - h
            const y0 = c.y - h
            const x1 = c.x + w + h
            const y1 = c.y + d + h
            env(s).drawings.push({
              id,
              kind: 'wall',
              points: [
                { x: x0, y: y0 },
                { x: x1, y: y0 },
                { x: x1, y: y1 },
                { x: x0, y: y1 },
              ].map(rp),
              closed: true,
              thicknessMm: s.wallThicknessMm,
            })
            setSel(s, { kind: 'drawing', id })
            s.tool = 'select'
          })
          return id
        },
        addOpening: (o) => {
          const def = openingDef(o.type)
          const id = newId()
          set((s) => {
            env(s).openings.push({
              ...o,
              id,
              offsetMm: roundMm(o.offsetMm),
              widthMm: def.widthMm,
              heightMm: def.heightMm,
              sillMm: def.sillMm,
              hinge: 'start',
            })
            setSel(s, { kind: 'opening', id })
            s.tool = 'select'
            s.placeOpeningType = null
          })
          return id
        },
        updateOpening: (id, patch) =>
          set((s) => {
            const o = env(s).openings.find((x) => x.id === id)
            if (!o) return
            Object.assign(o, patch)
            o.offsetMm = roundMm(o.offsetMm)
            o.widthMm = Math.max(300, roundMm(o.widthMm))
            o.heightMm = Math.max(100, roundMm(o.heightMm))
            o.sillMm = Math.max(0, roundMm(o.sillMm))
          }),
        editWall: (wallId, fn) =>
          set((s) => {
            const e = env(s)
            const i = e.drawings.findIndex((d) => d.id === wallId && d.kind === 'wall')
            if (i < 0) return
            const before = current(e.drawings[i]!) as Wall
            const after = fn(before)
            if (after === before) return
            e.drawings[i] = after
            e.openings = reattachOpenings(before, after, current(e.openings))
          }),
        editWalls: (fn) =>
          set((s) => {
            const e = env(s)
            const before = e.drawings
              .filter((d): d is Wall => d.kind === 'wall')
              .map((w) => current(w) as Wall)
            const after = fn(before)
            const byId = new Map(after.map((w) => [w.id, w]))
            let openings = current(e.openings)
            e.drawings = e.drawings.map((d) => {
              if (d.kind !== 'wall') return d
              const old = before.find((w) => w.id === d.id)!
              const nw = byId.get(d.id)
              if (!nw || JSON.stringify(nw.points) === JSON.stringify(old.points)) return d
              openings = reattachOpenings(old, nw, openings)
              return nw
            })
            e.openings = openings
          }),
        updateDrawing: (id, patch) =>
          set((s) => {
            const d = env(s).drawings.find((x) => x.id === id)
            if (d) Object.assign(d, patch)
          }),

        moveSelection: (dx, dy) =>
          set((s) => {
            if (dx === 0 && dy === 0) return
            const mv = (p: Vec2) => rp({ x: p.x + dx, y: p.y + dy })
            const e = env(s)
            for (const sel of s.selected) {
              if (sel.kind === 'item') {
                const it = e.items.find((i) => i.id === sel.id)
                if (it) it.position = mv(it.position)
                continue
              }
              if (sel.kind === 'opening') continue // portas/janelas andam com a parede
              const d = e.drawings.find((x) => x.id === sel.id)
              if (!d) continue
              if (d.kind === 'wall' || d.kind === 'chain' || d.kind === 'area')
                d.points = d.points.map(mv)
              else if (d.kind === 'dimension') {
                d.p1 = mv(d.p1)
                d.p2 = mv(d.p2)
              } else d.at = mv(d.at)
            }
          }),
        rotateSelection: (deg) => {
          const sel = get().selection
          if (sel?.kind === 'opening') {
            const o = env(get()).openings.find((x) => x.id === sel.id)
            if (o) get().updateOpening(sel.id, { side: o.side === 'left' ? 'right' : 'left' })
            return
          }
          if (sel?.kind === 'drawing') {
            const d = env(get()).drawings.find((x) => x.id === sel.id)
            if (d?.kind === 'column')
              get().updateDrawing(d.id, {
                rotationDeg: (((d.rotationDeg + deg) % 360) + 360) % 360,
              })
            return
          }
          if (sel?.kind !== 'item') return
          const it = env(get()).items.find((i) => i.id === sel.id)
          if (it) get().updateItem(sel.id, { rotationDeg: it.rotationDeg + deg })
        },
        mirrorSelection: () =>
          set((s) => {
            const sel = s.selection
            if (sel?.kind === 'opening') {
              const o = env(s).openings.find((x) => x.id === sel.id)
              if (o) o.hinge = o.hinge === 'start' ? 'end' : 'start'
              return
            }
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
            if (sel.kind === 'opening') {
              const o = env(s).openings.find((x) => x.id === sel.id)
              if (!o) return
              env(s).openings.push({
                ...structuredClone(current(o)),
                id,
                offsetMm: o.offsetMm + o.widthMm + 200,
              })
              setSel(s, { kind: 'opening', id })
              return
            }
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
              if (copy.kind === 'wall' || copy.kind === 'chain' || copy.kind === 'area')
                copy.points = copy.points.map(offset)
              else if (copy.kind === 'dimension') {
                copy.p1 = offset(copy.p1)
                copy.p2 = offset(copy.p2)
              } else copy.at = offset(copy.at)
              env(s).drawings.push(copy)
            }
            setSel(s, { kind: sel.kind, id })
          }),
        deleteSelection: () =>
          set((s) => {
            if (!s.selected.length) return
            const e = env(s)
            const ids = (k: SelRef['kind']) =>
              new Set(s.selected.filter((r) => r.kind === k).map((r) => r.id))
            const items = ids('item')
            const drawings = ids('drawing')
            const openings = ids('opening')
            e.items = e.items.filter((i) => !items.has(i.id))
            e.drawings = e.drawings.filter((d) => !drawings.has(d.id))
            // Portas e janelas vão junto com a parede.
            e.openings = e.openings.filter((o) => !openings.has(o.id) && !drawings.has(o.wallId))
            setSel(s, null)
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

// Acesso ao estado pelo console/testes em desenvolvimento.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __editor: typeof useEditor }).__editor = useEditor
}

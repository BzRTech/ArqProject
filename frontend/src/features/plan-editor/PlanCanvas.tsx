import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBlock } from '@/core/blocks/catalog'
import { dimensionDirection } from '@/core/dimensions/layout'
import { entitiesBBox } from '@/core/drawing/bounds'
import type { Entity } from '@/core/drawing/entities'
import { snapPoint, type SnapKind } from '@/core/editor/snap'
import { expand, isEmpty } from '@/core/geometry/bbox'
import {
  add,
  distance,
  dot,
  leftNormal,
  normalize,
  scale,
  sub,
  type Vec2,
} from '@/core/geometry/vec'
import { fit, pan, screenToWorld, zoomAt, type Viewport } from '@/core/geometry/viewport'
import { areaM2Text } from '@/core/project/areas'
import { itemCorners, itemEntities } from '@/core/project/items'
import { environmentMarkers } from '@/core/project/markers'
import { openingDef, openingEntities, openingFrame } from '@/core/project/openings'
import { drawingEntities, environmentEntities } from '@/core/project/render'
import {
  ITEM_DEFAULTS,
  type Drawing,
  type Environment,
  type Item,
  type Opening,
  type OpeningType,
} from '@/core/project/schema'
import { nearestWall, wallEntities, wallOutline } from '@/core/project/walls'
import { formatLength, parseLength, UNIT_LABEL } from '@/core/units'
import { Compiled } from './Compiled'
import {
  DISPLAY_SCALE,
  dimensionLine,
  hitHandle,
  hitTest,
  snapPoints,
  textBox,
  wallsOf,
} from './geometry'
import { useAssetUrl } from './hooks'
import { redo, selectActiveEnv, undo, useEditor, type Selection } from './store'
import { useUnits } from './units-pref'

const DRAFT = '#1f6feb'
const GRID_MOVE = 10 // mm — passo ao arrastar e inserir
const GRID_DRAW = 50 // mm — passo da grade ao desenhar

const ItemView = memo(function ItemView({ item }: { item: Item }) {
  const entities = useMemo(() => itemEntities(item), [item])
  return <Compiled entities={entities} role="item" />
})

const NO_OPENINGS: Opening[] = []
/** Distância máxima (px de tela) para uma porta/janela "grudar" numa parede. */
const OPENING_REACH_PX = 40

const DrawingView = memo(function DrawingView({
  d,
  openings,
}: {
  d: Drawing
  openings: Opening[]
}) {
  const entities = useMemo(() => drawingEntities(d, DISPLAY_SCALE, openings), [d, openings])
  return <Compiled entities={entities} role={`drawing-${d.kind}`} />
})

function BasePlanView({ env }: { env: Environment }) {
  const bp = env.basePlan
  const href = useAssetUrl(bp?.assetId)
  if (!bp || !bp.visible || !href) return null
  return (
    <image
      href={href}
      x={bp.x}
      y={bp.y}
      width={bp.widthMm}
      height={bp.heightMm}
      opacity={bp.opacity}
      preserveAspectRatio="none"
      data-testid="base-plan"
    />
  )
}

function SelectionOverlay({ env, sel, px }: { env: Environment; sel: Selection; px: number }) {
  if (!sel) return null
  const common = {
    fill: 'none',
    stroke: DRAFT,
    strokeWidth: 1.5 * px,
    strokeDasharray: `${6 * px} ${3 * px}`,
  }
  if (sel.kind === 'item') {
    const it = env.items.find((i) => i.id === sel.id)
    if (!it) return null
    const c = itemCorners(it)
    return (
      <g data-testid="selection">
        <polygon points={c.map((p) => `${p.x},${p.y}`).join(' ')} {...common} />
        {c.map((p, i) => (
          <rect
            key={i}
            x={p.x - 3 * px}
            y={p.y - 3 * px}
            width={6 * px}
            height={6 * px}
            fill="#fff"
            stroke={DRAFT}
            strokeWidth={px}
          />
        ))}
        {/* marca do "fundo" do bloco (encosto/parede) */}
        <line
          x1={c[0]!.x}
          y1={c[0]!.y}
          x2={c[1]!.x}
          y2={c[1]!.y}
          stroke={DRAFT}
          strokeWidth={3 * px}
        />
      </g>
    )
  }
  if (sel.kind === 'opening') {
    const o = env.openings.find((x) => x.id === sel.id)
    const w = o && wallsOf(env).find((x) => x.id === o.wallId)
    const f = o && w && openingFrame(w, o)
    if (!f) return null
    const h = f.halfThickness + 4 * px
    const c = [
      add(f.a, scale(f.n, h)),
      add(f.b, scale(f.n, h)),
      add(f.b, scale(f.n, -h)),
      add(f.a, scale(f.n, -h)),
    ]
    return (
      <g data-testid="selection">
        <polygon points={c.map((q) => `${q.x},${q.y}`).join(' ')} {...common} />
      </g>
    )
  }
  const d = env.drawings.find((x) => x.id === sel.id)
  if (!d) return null
  if (d.kind === 'wall') {
    const o = wallOutline(d.points, d.thicknessMm, d.closed)
    return (
      <g data-testid="selection">
        {o?.rings.map((r, i) => (
          <polygon key={i} points={r.map((p) => `${p.x},${p.y}`).join(' ')} {...common} />
        ))}
      </g>
    )
  }
  if (d.kind === 'dimension' || d.kind === 'chain') {
    const [a, b] = dimensionLine(d)
    return (
      <g data-testid="selection">
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          {...common}
          strokeWidth={4 * px}
          strokeOpacity={0.5}
        />
      </g>
    )
  }
  if (d.kind === 'area') {
    return (
      <g data-testid="selection">
        <polygon
          points={d.points.map((q) => `${q.x},${q.y}`).join(' ')}
          {...common}
          strokeWidth={2 * px}
        />
      </g>
    )
  }
  const b = textBox(d.at, d.text, d.sizeMm)
  return (
    <g data-testid="selection">
      <rect
        x={b.x - 4 * px}
        y={b.y - 4 * px}
        width={b.w + 8 * px}
        height={b.h + 8 * px}
        {...common}
      />
    </g>
  )
}

interface Props {
  fitSignal: number
}

export function PlanCanvas({ fitSignal }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const env = useEditor(selectActiveEnv)
  const tool = useEditor((s) => s.tool)
  const selection = useEditor((s) => s.selection)
  const placeBlockId = useEditor((s) => s.placeBlockId)
  const wallThickness = useEditor((s) => s.wallThicknessMm)
  const calibration = useEditor((s) => s.calibration)
  const wallUnit = useUnits((s) => s.wall)
  const placeOpeningType = useEditor((s) => s.placeOpeningType)
  const roomSize = useEditor((s) => s.roomSize)

  const [view, setView] = useState<Viewport>({ scale: 0.15, tx: 40, ty: 40 })
  const [cursor, setCursor] = useState<Vec2 | null>(null)
  const [snapKind, setSnapKind] = useState<SnapKind>('free')
  const [wallDraft, setWallDraft] = useState<Vec2[]>([])
  const [dimDraft, setDimDraft] = useState<Vec2[]>([])
  const [areaDraft, setAreaDraft] = useState<Vec2[]>([])
  /** Comprimento digitado durante o desenho de parede (cm, pt-BR). */
  const [typed, setTyped] = useState('')
  const cursorRef = useRef<Vec2 | null>(null)
  // Troca de ferramenta ou de ambiente descarta rascunhos (ajuste de estado no render).
  const draftKey = `${tool}:${env.id}`
  const [prevDraftKey, setPrevDraftKey] = useState(draftKey)
  if (prevDraftKey !== draftKey) {
    setPrevDraftKey(draftKey)
    setWallDraft([])
    setDimDraft([])
    setAreaDraft([])
    setTyped('')
  }
  const drag = useRef<{
    mode: 'pan' | 'move' | 'opening' | 'handle'
    last: Vec2
    start: Vec2
    applied: Vec2
    /** Arrasto de esquadria: posição inicial e ponto de pega projetado na parede. */
    opening?: {
      offsetMm: number
      wallId: string
      segment: number
      grabAlong: number
      startScreen: Vec2
    }
    /** Arrasto de balão/rótulo: o que é e o deslocamento inicial. */
    handle?: { kind: 'marker' | 'area-label'; id: string; from: Vec2 }
  } | null>(null)

  const px = 1 / view.scale // 1 px de tela em mm do modelo
  const endpoints = useMemo(() => snapPoints(env), [env])
  const markers = useMemo(
    () => environmentMarkers({ items: env.items }, DISPLAY_SCALE),
    [env.items],
  )
  const walls = useMemo(() => wallsOf(env), [env])
  const openingsByWall = useMemo(() => {
    const m = new Map<string, Opening[]>()
    for (const o of env.openings) m.set(o.wallId, [...(m.get(o.wallId) ?? []), o])
    return m
  }, [env.openings])

  /** Ponto do próximo vértice quando o usuário digitou um comprimento. */
  const typedPoint = useCallback(
    (from: Vec2, toward: Vec2 | null): Vec2 | null => {
      const mm = parseLength(typed, wallUnit)
      if (!mm || mm <= 0) return null
      const d =
        toward && distance(from, toward) > 0.5 ? normalize(sub(toward, from)) : { x: 1, y: 0 }
      const q = add(from, scale(d, mm))
      return { x: Math.round(q.x), y: Math.round(q.y) }
    },
    [typed, wallUnit],
  )

  /** Onde uma porta/janela cairia com o cursor em `p`. */
  const openingTarget = useCallback(
    (p: Vec2, type: OpeningType, reach = OPENING_REACH_PX * px) => {
      const hit = nearestWall(walls, p, reach)
      if (!hit) return null
      return {
        wallId: hit.wallId,
        segment: hit.segment,
        offsetMm: Math.round(hit.along / GRID_MOVE) * GRID_MOVE,
        side: hit.side,
        type,
      }
    },
    [walls, px],
  )

  const toModel = useCallback(
    (e: { clientX: number; clientY: number }): Vec2 => {
      const r = ref.current!.getBoundingClientRect()
      return screenToWorld(view, { x: e.clientX - r.left, y: e.clientY - r.top })
    },
    [view],
  )

  const fitToContent = useCallback(() => {
    const el = ref.current
    if (!el) return
    const s = useEditor.getState()
    const e = selectActiveEnv(s)
    let bb = entitiesBBox(
      environmentEntities(e, { scale: DISPLAY_SCALE, basePlanHref: e.basePlan ? 'x' : undefined }),
      DISPLAY_SCALE,
    )
    if (isEmpty(bb)) bb = { minX: 0, minY: 0, maxX: 6000, maxY: 4500 }
    bb = expand(bb, 300)
    setView(
      fit(
        { x: bb.minX, y: bb.minY, width: bb.maxX - bb.minX, height: bb.maxY - bb.minY },
        { width: el.clientWidth, height: el.clientHeight },
        24,
      ),
    )
  }, [])

  // Enquadrar ao abrir, ao trocar de ambiente e quando pedirem.
  useEffect(fitToContent, [fitToContent, env.id, fitSignal])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      setView((v) =>
        zoomAt(v, Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top }),
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const snap = useCallback(
    (p: Vec2, opts: { ortho?: Vec2; free?: boolean; grid?: number } = {}) =>
      snapPoint(p, {
        grid: opts.free ? 0 : (opts.grid ?? GRID_DRAW),
        endpoints: opts.free ? [] : [...endpoints, ...wallDraft, ...dimDraft, ...areaDraft],
        tolerance: 10 * px,
        orthoFrom: opts.free ? undefined : opts.ortho,
      }),
    [endpoints, wallDraft, dimDraft, areaDraft, px],
  )

  const commitWall = useCallback((pts: Vec2[], closed: boolean) => {
    const clean = pts.filter((p, i) => i === 0 || distance(p, pts[i - 1]!) > 0.5)
    if (clean.length >= 2) useEditor.getState().addWall(clean, closed && clean.length >= 3)
    setWallDraft([])
  }, [])

  const commitArea = useCallback((pts: Vec2[]) => {
    const clean = pts.filter((p, i) => i === 0 || distance(p, pts[i - 1]!) > 0.5)
    if (clean.length >= 3) useEditor.getState().addArea(clean)
    setAreaDraft([])
  }, [])

  // --- Teclado -------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      )
        return
      const s = useEditor.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && key === 'd') {
        e.preventDefault()
        s.duplicateSelection()
        return
      }
      if (mod) return
      if (s.tool === 'wall' && wallDraft.length) {
        if (/^[0-9]$/.test(e.key) || e.key === ',' || e.key === '.') {
          e.preventDefault()
          setTyped((t) => (t + e.key).slice(0, 8))
          return
        }
        if (e.key === 'Enter' && typed) {
          e.preventDefault()
          const last = wallDraft[wallDraft.length - 1]!
          const q = typedPoint(last, cursorRef.current)
          if (q) setWallDraft((d) => [...d, q])
          setTyped('')
          return
        }
        if (e.key === 'Escape' && typed) {
          setTyped('')
          return
        }
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          commitWall(wallDraft, false)
          return
        }
        if (e.key === 'Backspace') {
          e.preventDefault()
          if (typed) setTyped((t) => t.slice(0, -1))
          else setWallDraft((d) => d.slice(0, -1))
          return
        }
      }
      if (s.tool === 'area' && areaDraft.length) {
        if (e.key === 'Enter') {
          e.preventDefault()
          commitArea(areaDraft)
          return
        }
        if (e.key === 'Escape') {
          setAreaDraft([])
          return
        }
        if (e.key === 'Backspace') {
          e.preventDefault()
          setAreaDraft((d) => d.slice(0, -1))
          return
        }
      }
      if (s.tool === 'dimension' && dimDraft.length && e.key === 'Escape') {
        setDimDraft([])
        return
      }
      switch (e.key) {
        case 'Escape':
          if (s.tool !== 'select') s.setTool('select')
          else s.select(null)
          break
        case 'Delete':
        case 'Backspace':
          if (s.selection) {
            e.preventDefault()
            s.deleteSelection()
          }
          break
        default:
          switch (key) {
            case 'v':
              s.setTool('select')
              break
            case 'w':
              s.setTool('wall')
              break
            case 'a':
              s.setTool('room')
              break
            case 'q':
              s.setTool('area')
              break
            case 'p':
              s.startOpening('porta-abrir')
              break
            case 'j':
              s.startOpening('janela-correr-2')
              break
            case 'c':
              s.setTool('dimension')
              break
            case 't':
              s.setTool('text')
              break
            case 'r':
              s.rotateSelection(e.shiftKey ? -90 : 90)
              break
            case 'm':
              s.mirrorSelection()
              break
            case 'f':
              fitToContent()
              break
          }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wallDraft, dimDraft, areaDraft, commitWall, commitArea, fitToContent, typed, typedPoint])

  // --- Ponteiro --------------------------------------------------------------
  const screenPt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = useEditor.getState()
    const p = toModel(e)
    const sp = screenPt(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (e.button === 1 || e.button === 2) {
      drag.current = { mode: 'pan', last: sp, start: p, applied: { x: 0, y: 0 } }
      return
    }
    switch (s.tool) {
      case 'select': {
        // Balões e rótulos de área têm prioridade: arrastá-los não mexe no item/área.
        const handle = hitHandle(env, p, 4 * px)
        if (handle) {
          const id = handle.kind === 'marker' ? handle.itemId : handle.areaId
          s.select({ kind: handle.kind === 'marker' ? 'item' : 'drawing', id })
          const from =
            handle.kind === 'marker'
              ? (env.items.find((i) => i.id === id)?.markerOffset ?? { x: 0, y: 0 })
              : ((
                  env.drawings.find((d) => d.id === id && d.kind === 'area') as
                    { labelOffset?: Vec2 } | undefined
                )?.labelOffset ?? { x: 0, y: 0 })
          s.beginInteraction()
          drag.current = {
            mode: 'handle',
            last: sp,
            start: p,
            applied: { x: 0, y: 0 },
            handle: { kind: handle.kind, id, from },
          }
          break
        }
        const hit = hitTest(env, p, 6 * px)
        s.select(hit)
        if (hit) {
          s.beginInteraction()
          const o = hit.kind === 'opening' ? env.openings.find((x) => x.id === hit.id) : undefined
          const grab = o && openingTarget(p, o.type, 1500)
          drag.current = {
            mode: hit.kind === 'opening' ? 'opening' : 'move',
            last: sp,
            start: p,
            applied: { x: 0, y: 0 },
            opening:
              o && grab
                ? {
                    offsetMm: o.offsetMm,
                    wallId: o.wallId,
                    segment: o.segment,
                    grabAlong: grab.offsetMm,
                    startScreen: sp,
                  }
                : undefined,
          }
        } else {
          drag.current = { mode: 'pan', last: sp, start: p, applied: { x: 0, y: 0 } }
        }
        break
      }
      case 'place':
        if (placeBlockId) s.addItem(placeBlockId, snap(p, { grid: GRID_MOVE }).point)
        break
      case 'opening': {
        const t = placeOpeningType && openingTarget(p, placeOpeningType)
        if (t) s.addOpening(t)
        break
      }
      case 'room':
        s.addRoom(snap(p, { grid: GRID_DRAW }).point)
        break
      case 'wall': {
        const last = wallDraft[wallDraft.length - 1]
        const snapped = snap(p, { ortho: e.shiftKey ? undefined : last }).point
        const q = (last && typedPoint(last, snapped)) || snapped
        setTyped('')
        const first = wallDraft[0]
        if (first && wallDraft.length >= 3 && distance(q, first) < 0.5) {
          commitWall(wallDraft, true)
        } else {
          setWallDraft((d) => [...d, q])
        }
        break
      }
      case 'dimension': {
        if (dimDraft.length < 2) {
          const q = snap(p, { ortho: e.shiftKey ? undefined : dimDraft[0] }).point
          setDimDraft((d) => [...d, q])
        } else {
          const [p1, p2] = dimDraft as [Vec2, Vec2]
          const orientation = p1.y === p2.y ? 'horizontal' : p1.x === p2.x ? 'vertical' : 'aligned'
          const dir = dimensionDirection(p1, p2, orientation)
          const offsetMm = dot(sub(p, p1), leftNormal(dir))
          s.addDimension({ p1, p2, orientation, offsetMm })
          setDimDraft([])
        }
        break
      }
      case 'text':
        s.addText(snap(p, { grid: GRID_MOVE }).point)
        break
      case 'area': {
        const q = snap(p, { ortho: e.shiftKey ? undefined : areaDraft[areaDraft.length - 1] }).point
        const first = areaDraft[0]
        if (first && areaDraft.length >= 3 && distance(q, first) < 0.5) commitArea(areaDraft)
        else setAreaDraft((d) => [...d, q])
        break
      }
      case 'calibrate':
        s.setCalibration(calibration.length >= 2 ? [p] : [...calibration, p])
        break
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = toModel(e)
    const sp = screenPt(e)
    const s = useEditor.getState()
    const d = drag.current
    if (d?.mode === 'pan') {
      setView((v) => pan(v, sp.x - d.last.x, sp.y - d.last.y))
      d.last = sp
    } else if (d?.mode === 'handle' && d.handle) {
      const h = d.handle
      const off = {
        x: Math.round((h.from.x + p.x - d.start.x) / GRID_MOVE) * GRID_MOVE,
        y: Math.round((h.from.y + p.y - d.start.y) / GRID_MOVE) * GRID_MOVE,
      }
      if (h.kind === 'marker') s.updateItem(h.id, { markerOffset: off })
      else s.updateDrawing(h.id, { labelOffset: off })
    } else if (d?.mode === 'move') {
      const want = {
        x: Math.round((p.x - d.start.x) / GRID_MOVE) * GRID_MOVE,
        y: Math.round((p.y - d.start.y) / GRID_MOVE) * GRID_MOVE,
      }
      s.moveSelection(want.x - d.applied.x, want.y - d.applied.y)
      d.applied = want
    } else if (d?.mode === 'opening' && d.opening && s.selection?.kind === 'opening') {
      // A porta/janela desliza pela parede (relativo ao ponto de pega) ou passa para outra
      // parede próxima. Só começa depois de alguns pixels, para um clique não deslocar.
      const sel = s.selection
      const g = d.opening
      const o = selectActiveEnv(s).openings.find((x) => x.id === sel.id)
      const t = distance(sp, g.startScreen) > 4 && o ? openingTarget(p, o.type, 1500) : null
      if (o && t) {
        const sameSegment = t.wallId === g.wallId && t.segment === g.segment
        const offsetMm = sameSegment ? g.offsetMm + (t.offsetMm - g.grabAlong) : t.offsetMm
        s.updateOpening(o.id, { wallId: t.wallId, segment: t.segment, offsetMm })
      }
    }
    // Cursor "efetivo" para pré-visualizações
    if (s.tool === 'wall') {
      const r = snap(p, { ortho: e.shiftKey ? undefined : wallDraft[wallDraft.length - 1] })
      setCursor(r.point)
      setSnapKind(r.kind)
    } else if (s.tool === 'area') {
      const r = snap(p, { ortho: e.shiftKey ? undefined : areaDraft[areaDraft.length - 1] })
      setCursor(r.point)
      setSnapKind(r.kind)
    } else if (s.tool === 'dimension' && dimDraft.length < 2) {
      const r = snap(p, { ortho: e.shiftKey ? undefined : dimDraft[0] })
      setCursor(r.point)
      setSnapKind(r.kind)
    } else if (s.tool === 'place' || s.tool === 'room') {
      setCursor(snap(p, { grid: s.tool === 'room' ? GRID_DRAW : GRID_MOVE }).point)
      setSnapKind('grid')
    } else {
      setCursor(p)
      setSnapKind('free')
    }
  }

  const onPointerUp = () => {
    if (
      drag.current?.mode === 'move' ||
      drag.current?.mode === 'opening' ||
      drag.current?.mode === 'handle'
    ) {
      useEditor.getState().endInteraction()
    }
    drag.current = null
  }

  useEffect(() => {
    cursorRef.current = cursor
  }, [cursor])

  // --- Pré-visualizações -----------------------------------------------------
  const draftEntities = useMemo((): Entity[] => {
    if (!cursor) return []
    if (tool === 'wall' && wallDraft.length) {
      const last = wallDraft[wallDraft.length - 1]!
      const end = typedPoint(last, cursor) ?? cursor
      const pts = [...wallDraft, end]
      const out: Entity[] = wallEntities(
        { points: pts, thicknessMm: wallThickness, closed: false },
        DRAFT,
      )
      if (distance(last, end) > 1) {
        out.push({
          kind: 'dimension',
          p1: last,
          p2: end,
          orientation: 'aligned',
          offset: 8,
          style: { color: DRAFT },
        })
      }
      return out
    }
    if (tool === 'dimension' && dimDraft.length === 1) {
      return [
        { kind: 'line', a: dimDraft[0]!, b: cursor, style: { color: DRAFT, lineType: 'dashed' } },
      ]
    }
    if (tool === 'dimension' && dimDraft.length === 2) {
      const [p1, p2] = dimDraft as [Vec2, Vec2]
      const orientation = p1.y === p2.y ? 'horizontal' : p1.x === p2.x ? 'vertical' : 'aligned'
      const dir = dimensionDirection(p1, p2, orientation)
      const off = dot(sub(cursor, p1), leftNormal(dir))
      return [
        {
          kind: 'dimension',
          p1,
          p2,
          orientation,
          offset: off / DISPLAY_SCALE,
          style: { color: DRAFT },
        },
      ]
    }
    if (tool === 'area' && areaDraft.length) {
      const pts = [...areaDraft, cursor]
      const out: Entity[] = [
        {
          kind: 'polyline',
          points: pts,
          closed: pts.length >= 3,
          style: { color: DRAFT, lineType: 'dashed' },
        },
      ]
      if (pts.length >= 3) {
        const c = {
          x: pts.reduce((a, q) => a + q.x, 0) / pts.length,
          y: pts.reduce((a, q) => a + q.y, 0) / pts.length,
        }
        out.push({
          kind: 'text',
          at: c,
          text: areaM2Text({ points: pts }),
          size: 2.6,
          anchor: 'middle',
          vAlign: 'middle',
          color: DRAFT,
          weight: 'bold',
        })
      }
      return out
    }
    if (tool === 'room') {
      const h = wallThickness / 2
      const { w, d } = roomSize
      const x0 = cursor.x - h
      const y0 = cursor.y - h
      return [
        ...wallEntities(
          {
            points: [
              { x: x0, y: y0 },
              { x: cursor.x + w + h, y: y0 },
              { x: cursor.x + w + h, y: cursor.y + d + h },
              { x: x0, y: cursor.y + d + h },
            ],
            thicknessMm: wallThickness,
            closed: true,
          },
          DRAFT,
        ),
        {
          kind: 'dimension',
          p1: cursor,
          p2: { x: cursor.x + w, y: cursor.y },
          orientation: 'horizontal',
          offset: -6,
          style: { color: DRAFT },
        },
        {
          kind: 'dimension',
          p1: cursor,
          p2: { x: cursor.x, y: cursor.y + d },
          orientation: 'vertical',
          offset: 6,
          style: { color: DRAFT },
        },
      ]
    }
    if (tool === 'opening' && placeOpeningType) {
      const t = openingTarget(cursor, placeOpeningType)
      const w = t && walls.find((x) => x.id === t.wallId)
      if (!t || !w) return []
      const def = openingDef(placeOpeningType)
      const ghost: Opening = {
        ...t,
        id: 'ghost',
        widthMm: def.widthMm,
        heightMm: def.heightMm,
        sillMm: def.sillMm,
        hinge: 'start',
      }
      const f = openingFrame(w, ghost)
      if (!f) return []
      const h = f.halfThickness
      return [
        {
          kind: 'polyline',
          points: [
            add(f.a, scale(f.n, h)),
            add(f.b, scale(f.n, h)),
            add(f.b, scale(f.n, -h)),
            add(f.a, scale(f.n, -h)),
          ],
          closed: true,
          style: null,
          fill: { color: '#ffffff' },
        },
        ...openingEntities(w, ghost),
      ]
    }
    if (tool === 'place' && placeBlockId) {
      const b = getBlock(placeBlockId)
      return itemEntities({
        id: 'ghost',
        blockId: b.id,
        blockVersion: b.version,
        name: b.name,
        position: cursor,
        rotationDeg: 0,
        mirrored: false,
        sizeMm: b.defaultSize,
        ...ITEM_DEFAULTS,
      })
    }
    return []
  }, [
    tool,
    cursor,
    wallDraft,
    dimDraft,
    areaDraft,
    placeBlockId,
    wallThickness,
    typedPoint,
    roomSize,
    placeOpeningType,
    openingTarget,
    walls,
  ])

  const gridMinorVisible = view.scale * 100 >= 6

  const hint = {
    select: 'Clique para selecionar · arraste para mover · R gira · M espelha · Del exclui',
    wall: wallDraft.length
      ? 'Clique ou DIGITE o comprimento (cm) + Enter · clique no 1º ponto fecha · Esc termina · Shift livre'
      : 'Clique para começar a parede (eixo) · Shift desliga o ortogonal',
    room: `Clique para posicionar o canto interno · ${formatLength(roomSize.w, wallUnit)} × ${formatLength(roomSize.d, wallUnit)} ${UNIT_LABEL[wallUnit]} internos`,
    opening: 'Aproxime de uma parede e clique · o lado do cursor define para onde abre',
    dimension:
      ['Clique no 1º ponto da cota', 'Clique no 2º ponto', 'Mova para afastar a cota e clique'][
        dimDraft.length
      ] ?? '',
    text: 'Clique para inserir um texto',
    area: areaDraft.length
      ? `Clique nos cantos · clique no 1º ponto ou Enter fecha · ${areaDraft.length >= 2 && cursor ? areaM2Text({ points: [...areaDraft, cursor] }) : ''}`
      : 'Clique nos cantos da área (snap nas faces das paredes) · Q',
    place: 'Clique para inserir o bloco · Esc cancela',
    calibrate: 'Clique em dois pontos de medida conhecida da planta base',
  }[tool]

  return (
    <div className="plan-canvas">
      <svg
        ref={ref}
        className={`canvas canvas--${tool}`}
        data-testid="plan-canvas"
        data-view={`${view.scale} ${view.tx} ${view.ty}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setCursor(null)}
        onDoubleClick={() => {
          if (tool === 'wall' && wallDraft.length >= 2) commitWall(wallDraft, false)
          if (tool === 'area' && areaDraft.length >= 3) commitArea(areaDraft)
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragOver={(e) => {
          const types = e.dataTransfer.types
          if (
            types.includes('application/x-prancheta-block') ||
            types.includes('application/x-prancheta-opening')
          ) {
            e.preventDefault()
          }
        }}
        onDrop={(e) => {
          const block = e.dataTransfer.getData('application/x-prancheta-block')
          const opening = e.dataTransfer.getData('application/x-prancheta-opening') as
            OpeningType | ''
          e.preventDefault()
          if (block)
            useEditor.getState().addItem(block, snap(toModel(e), { grid: GRID_MOVE }).point)
          if (opening) {
            const t = openingTarget(toModel(e), opening)
            if (t) useEditor.getState().addOpening(t)
          }
        }}
      >
        <defs>
          <pattern id="grid-minor" width={100} height={100} patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e7e2d7" strokeWidth={px} />
          </pattern>
          <pattern id="grid-major" width={1000} height={1000} patternUnits="userSpaceOnUse">
            {gridMinorVisible && <rect width={1000} height={1000} fill="url(#grid-minor)" />}
            <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#d3ccbd" strokeWidth={px} />
          </pattern>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect x={-100000} y={-100000} width={200000} height={200000} fill="#fbfaf7" />
          <rect x={-100000} y={-100000} width={200000} height={200000} fill="url(#grid-major)" />
          <BasePlanView env={env} />
          <g data-testid="items">
            {env.items.map((it) => (
              <ItemView key={it.id} item={it} />
            ))}
          </g>
          <g data-testid="drawings">
            {env.drawings
              .filter((d) => d.kind === 'wall')
              .map((d) => (
                <DrawingView key={d.id} d={d} openings={openingsByWall.get(d.id) ?? NO_OPENINGS} />
              ))}
            {env.drawings
              .filter((d) => d.kind !== 'wall')
              .map((d) => (
                <DrawingView key={d.id} d={d} openings={NO_OPENINGS} />
              ))}
          </g>
          <Compiled entities={markers} role="marcadores" />
          <Compiled entities={draftEntities} opacity={tool === 'place' ? 0.55 : 0.85} />
          <SelectionOverlay env={env} sel={selection} px={px} />
          {areaDraft.map((p, i) => (
            <circle key={`a${i}`} cx={p.x} cy={p.y} r={3 * px} fill={DRAFT} />
          ))}
          {wallDraft.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3 * px} fill={DRAFT} />
          ))}
          {tool === 'calibrate' &&
            calibration.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={5 * px}
                  fill="none"
                  stroke="#b23b3b"
                  strokeWidth={2 * px}
                />
                {i === 1 && (
                  <line
                    x1={calibration[0]!.x}
                    y1={calibration[0]!.y}
                    x2={p.x}
                    y2={p.y}
                    stroke="#b23b3b"
                    strokeWidth={2 * px}
                  />
                )}
              </g>
            ))}
          {cursor && tool === 'wall' && wallDraft.length > 0 && (
            <text
              x={cursor.x + 12 * px}
              y={cursor.y - 12 * px}
              fontSize={13 * px}
              fontFamily="Roboto, Arial, sans-serif"
              fill={typed ? '#b23b3b' : DRAFT}
              data-testid="typed-length"
            >
              {typed
                ? `${typed} ${UNIT_LABEL[wallUnit]} ↵`
                : `digite o comprimento (${UNIT_LABEL[wallUnit]})`}
            </text>
          )}
          {cursor && (tool === 'wall' || tool === 'dimension' || tool === 'area') && (
            <rect
              x={cursor.x - 4 * px}
              y={cursor.y - 4 * px}
              width={8 * px}
              height={8 * px}
              fill="none"
              stroke={snapKind === 'endpoint' ? '#e0a43a' : DRAFT}
              strokeWidth={1.5 * px}
            />
          )}
        </g>
      </svg>
      <footer className="statusbar" data-testid="editor-status">
        <span>
          {cursor
            ? `x ${formatLength(cursor.x, wallUnit)} · y ${formatLength(cursor.y, wallUnit)} ${UNIT_LABEL[wallUnit]}`
            : '—'}
        </span>
        <span>
          {snapKind === 'endpoint'
            ? 'snap: extremidade'
            : snapKind === 'ortho'
              ? 'snap: ortogonal'
              : ''}
        </span>
        <span className="statusbar__hint">{hint}</span>
      </footer>
    </div>
  )
}

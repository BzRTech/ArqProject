import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBlock } from '@/core/blocks/catalog'
import { dimensionDirection } from '@/core/dimensions/layout'
import { entitiesBBox } from '@/core/drawing/bounds'
import type { Entity } from '@/core/drawing/entities'
import { snapPoint, type SnapKind } from '@/core/editor/snap'
import { expand, isEmpty } from '@/core/geometry/bbox'
import { distance, dot, leftNormal, sub, type Vec2 } from '@/core/geometry/vec'
import { fit, pan, screenToWorld, zoomAt, type Viewport } from '@/core/geometry/viewport'
import { itemCorners, itemEntities } from '@/core/project/items'
import { drawingEntities, environmentEntities } from '@/core/project/render'
import type { Drawing, Environment, Item } from '@/core/project/schema'
import { wallEntities, wallOutline } from '@/core/project/walls'
import { formatDecimal } from '@/core/units'
import { Compiled } from './Compiled'
import { DISPLAY_SCALE, dimensionLine, hitTest, snapPoints, textBox } from './geometry'
import { useAssetUrl } from './hooks'
import { redo, selectActiveEnv, undo, useEditor, type Selection } from './store'

const DRAFT = '#1f6feb'
const GRID_MOVE = 10 // mm — passo ao arrastar e inserir
const GRID_DRAW = 50 // mm — passo da grade ao desenhar

const ItemView = memo(function ItemView({ item }: { item: Item }) {
  const entities = useMemo(() => itemEntities(item), [item])
  return <Compiled entities={entities} role="item" />
})

const DrawingView = memo(function DrawingView({ d }: { d: Drawing }) {
  const entities = useMemo(() => drawingEntities(d, DISPLAY_SCALE), [d])
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
  if (d.kind === 'dimension') {
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

  const [view, setView] = useState<Viewport>({ scale: 0.15, tx: 40, ty: 40 })
  const [cursor, setCursor] = useState<Vec2 | null>(null)
  const [snapKind, setSnapKind] = useState<SnapKind>('free')
  const [wallDraft, setWallDraft] = useState<Vec2[]>([])
  const [dimDraft, setDimDraft] = useState<Vec2[]>([])
  // Troca de ferramenta ou de ambiente descarta rascunhos (ajuste de estado no render).
  const draftKey = `${tool}:${env.id}`
  const [prevDraftKey, setPrevDraftKey] = useState(draftKey)
  if (prevDraftKey !== draftKey) {
    setPrevDraftKey(draftKey)
    setWallDraft([])
    setDimDraft([])
  }
  const drag = useRef<{ mode: 'pan' | 'move'; last: Vec2; start: Vec2; applied: Vec2 } | null>(null)

  const px = 1 / view.scale // 1 px de tela em mm do modelo
  const endpoints = useMemo(() => snapPoints(env), [env])

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
    )
    if (isEmpty(bb)) bb = { minX: 0, minY: 0, maxX: 6000, maxY: 4500 }
    bb = expand(bb, 600)
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
        endpoints: opts.free ? [] : [...endpoints, ...wallDraft, ...dimDraft],
        tolerance: 10 * px,
        orthoFrom: opts.free ? undefined : opts.ortho,
      }),
    [endpoints, wallDraft, dimDraft, px],
  )

  const commitWall = useCallback((pts: Vec2[], closed: boolean) => {
    const clean = pts.filter((p, i) => i === 0 || distance(p, pts[i - 1]!) > 0.5)
    if (clean.length >= 2) useEditor.getState().addWall(clean, closed && clean.length >= 3)
    setWallDraft([])
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
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          commitWall(wallDraft, false)
          return
        }
        if (e.key === 'Backspace') {
          e.preventDefault()
          setWallDraft((d) => d.slice(0, -1))
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
  }, [wallDraft, dimDraft, commitWall, fitToContent])

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
        const hit = hitTest(env, p, 6 * px)
        s.select(hit)
        if (hit) {
          s.beginInteraction()
          drag.current = { mode: 'move', last: sp, start: p, applied: { x: 0, y: 0 } }
        } else {
          drag.current = { mode: 'pan', last: sp, start: p, applied: { x: 0, y: 0 } }
        }
        break
      }
      case 'place':
        if (placeBlockId) s.addItem(placeBlockId, snap(p, { grid: GRID_MOVE }).point)
        break
      case 'wall': {
        const last = wallDraft[wallDraft.length - 1]
        const q = snap(p, { ortho: e.shiftKey ? undefined : last }).point
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
    } else if (d?.mode === 'move') {
      const want = {
        x: Math.round((p.x - d.start.x) / GRID_MOVE) * GRID_MOVE,
        y: Math.round((p.y - d.start.y) / GRID_MOVE) * GRID_MOVE,
      }
      s.moveSelection(want.x - d.applied.x, want.y - d.applied.y)
      d.applied = want
    }
    // Cursor "efetivo" para pré-visualizações
    if (s.tool === 'wall') {
      const r = snap(p, { ortho: e.shiftKey ? undefined : wallDraft[wallDraft.length - 1] })
      setCursor(r.point)
      setSnapKind(r.kind)
    } else if (s.tool === 'dimension' && dimDraft.length < 2) {
      const r = snap(p, { ortho: e.shiftKey ? undefined : dimDraft[0] })
      setCursor(r.point)
      setSnapKind(r.kind)
    } else if (s.tool === 'place') {
      setCursor(snap(p, { grid: GRID_MOVE }).point)
      setSnapKind('grid')
    } else {
      setCursor(p)
      setSnapKind('free')
    }
  }

  const onPointerUp = () => {
    if (drag.current?.mode === 'move') useEditor.getState().endInteraction()
    drag.current = null
  }

  // --- Pré-visualizações -----------------------------------------------------
  const draftEntities = useMemo((): Entity[] => {
    if (!cursor) return []
    if (tool === 'wall' && wallDraft.length) {
      const pts = [...wallDraft, cursor]
      const last = wallDraft[wallDraft.length - 1]!
      const out: Entity[] = wallEntities(
        { points: pts, thicknessMm: wallThickness, closed: false },
        DRAFT,
      )
      if (distance(last, cursor) > 1) {
        out.push({
          kind: 'dimension',
          p1: last,
          p2: cursor,
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
      })
    }
    return []
  }, [tool, cursor, wallDraft, dimDraft, placeBlockId, wallThickness])

  const gridMinorVisible = view.scale * 100 >= 6

  const hint = {
    select: 'Clique para selecionar · arraste para mover · R gira · M espelha · Del exclui',
    wall: wallDraft.length
      ? 'Clique para o próximo ponto · Enter/Esc termina · clique no 1º ponto fecha · Shift livre · ⌫ desfaz ponto'
      : 'Clique para começar a parede (eixo) · Shift desliga o ortogonal',
    dimension:
      ['Clique no 1º ponto da cota', 'Clique no 2º ponto', 'Mova para afastar a cota e clique'][
        dimDraft.length
      ] ?? '',
    text: 'Clique para inserir um texto',
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
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-prancheta-block')) e.preventDefault()
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData('application/x-prancheta-block')
          if (!id) return
          e.preventDefault()
          useEditor.getState().addItem(id, snap(toModel(e), { grid: GRID_MOVE }).point)
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
                <DrawingView key={d.id} d={d} />
              ))}
            {env.drawings
              .filter((d) => d.kind !== 'wall')
              .map((d) => (
                <DrawingView key={d.id} d={d} />
              ))}
          </g>
          <Compiled entities={draftEntities} opacity={tool === 'place' ? 0.55 : 0.85} />
          <SelectionOverlay env={env} sel={selection} px={px} />
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
          {cursor && (tool === 'wall' || tool === 'dimension') && (
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
            ? `x ${formatDecimal(cursor.x / 10, 1)} · y ${formatDecimal(cursor.y / 10, 1)} cm`
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

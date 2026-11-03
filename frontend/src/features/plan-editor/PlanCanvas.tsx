import { Minus, Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBlock } from '@/core/blocks/catalog'
import { dimensionDirection } from '@/core/dimensions/layout'
import { entitiesBBox } from '@/core/drawing/bounds'
import type { Entity } from '@/core/drawing/entities'
import { rightAngleSnap, vertexConstraints, type AngleConstraint } from '@/core/editor/right-angle'
import { snapPoint, type SnapKind } from '@/core/editor/snap'
import { stageEnv } from '@/core/editor/stages'
import { expand, isEmpty, rectFromCorners } from '@/core/geometry/bbox'
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
import {
  fit,
  pan,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Viewport,
} from '@/core/geometry/viewport'
import { areaM2Text } from '@/core/project/areas'
import { columnEntities, columnOutline, COLUMN_DEFAULTS } from '@/core/project/columns'
import { itemCorners, itemEntities, itemsInDrawOrder } from '@/core/project/items'
import { floorEntities } from '@/core/finishes/layout'
import { environmentMarkers } from '@/core/project/markers'
import {
  openingDef,
  openingEntities,
  openingFrame,
  segmentCenterOffset,
} from '@/core/project/openings'
import { drawingEntities, environmentEntities } from '@/core/project/render'
import {
  ITEM_DEFAULTS,
  type Drawing,
  type Environment,
  type Item,
  type Opening,
  type OpeningType,
  type Wall,
} from '@/core/project/schema'
import {
  insertVertex,
  moveVertexLinked,
  pushSegmentLinked,
  removeVertex,
  vertexAt,
} from '@/core/project/wall-edit'
import { wallsShape, wallsShapeEntities } from '@/core/project/wall-union'
import {
  hitWall,
  nearestWall,
  wallEntities,
  wallOutline,
  wallPoints,
  wallSegments,
} from '@/core/project/walls'
import { formatLength, parseLength, UNIT_LABEL } from '@/core/units'
import { Compiled } from './Compiled'
import {
  allRefs,
  DISPLAY_SCALE,
  dimensionLine,
  refsInRect,
  columnPlacement,
  cornerAngleMarks,
  selectedMarkerEntities,
  wallEditGuides,
  hitHandle,
  hitTest,
  nearestWallVertex,
  openingGuides,
  snapMidpoints,
  snapPoints,
  textBox,
  wallsOf,
} from './geometry'
import { useAssetUrl } from './hooks'
import { redo, selectActiveEnv, undo, useEditor, type Selection } from './store'
import { UI } from './theme'
import { useUnits } from './units-pref'

const DRAFT = UI.clay
const GRID_MOVE = 10 // mm — passo ao arrastar e inserir
/** Faixas (px) cobertas pelos elementos flutuantes do palco, evitadas ao enquadrar. */
const FLOAT_TOP = 64
const FLOAT_BOTTOM = 104
/** Escala da vista (px de tela por mm do modelo) que mostra 1:50 em tamanho real: 96 px/pol. */
const SCALE_100 = 96 / 25.4 / DISPLAY_SCALE
/** Dica do rodapé: texto simples ou pares atalho + ação. */
type Hint = string | { k?: string; t: string }[]
const GRID_DRAW = 50 // mm — passo da grade ao desenhar

/** Opacidade do que está fora da aba (aparece como referência, sem clique). */
const DIMMED = 0.3

const ItemView = memo(function ItemView({
  item,
  humanized,
  dim,
}: {
  item: Item
  humanized: boolean
  dim: boolean
}) {
  const entities = useMemo(() => itemEntities(item, { humanized }), [item, humanized])
  return <Compiled entities={entities} role="item" opacity={dim ? DIMMED : undefined} />
})

const NO_OPENINGS: Opening[] = []
/** Distância máxima (px de tela) para uma porta/janela "grudar" numa parede. */
const OPENING_REACH_PX = 40
/** Distância (px) do meio do trecho em que a porta/janela gruda no centro. */
const CENTER_SNAP_PX = 14

const DrawingView = memo(function DrawingView({
  d,
  openings,
  dim,
}: {
  d: Drawing
  openings: Opening[]
  dim?: boolean
}) {
  const entities = useMemo(() => drawingEntities(d, DISPLAY_SCALE, openings), [d, openings])
  return (
    <Compiled entities={entities} role={`drawing-${d.kind}`} opacity={dim ? DIMMED : undefined} />
  )
})

/** Todas as paredes do ambiente como UMA figura (paredes encostadas se fundem). */
const WallsView = memo(function WallsView({
  walls,
  openings,
}: {
  walls: Wall[]
  openings: Opening[]
}) {
  const entities = useMemo(() => {
    const byId = new Map(walls.map((w) => [w.id, w]))
    return [
      ...wallsShapeEntities(wallsShape(walls, openings)),
      ...openings.flatMap((o) => {
        const w = byId.get(o.wallId)
        return w ? openingEntities(w, o) : []
      }),
    ]
  }, [walls, openings])
  return (
    <g data-testid="walls-layer" data-count={walls.length}>
      <Compiled entities={entities} role="paredes" />
    </g>
  )
})

/** Alças de edição da parede selecionada: cantos (quadrados) e meio dos trechos (círculos). */
function wallHandles(w: Wall) {
  return {
    vertices: wallPoints(w),
    mids: wallSegments(w).map((s) => ({
      seg: s.index,
      at: add(s.a, scale(s.dir, s.length / 2)),
      n: leftNormal(s.dir),
    })),
  }
}

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
            fill={UI.white}
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
    const h = wallHandles(d)
    return (
      <g data-testid="selection">
        {o?.rings.map((r, i) => (
          <polygon key={i} points={r.map((p) => `${p.x},${p.y}`).join(' ')} {...common} />
        ))}
        {h.mids.map((m) => (
          <circle
            key={`m${m.seg}`}
            cx={m.at.x}
            cy={m.at.y}
            r={5 * px}
            fill={UI.white}
            stroke={DRAFT}
            strokeWidth={1.5 * px}
            data-testid="wall-mid-handle"
          />
        ))}
        {h.vertices.map((v, i) => (
          <rect
            key={`v${i}`}
            x={v.x - 5 * px}
            y={v.y - 5 * px}
            width={10 * px}
            height={10 * px}
            fill={DRAFT}
            stroke={UI.white}
            strokeWidth={px}
            data-testid="wall-vertex-handle"
          />
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
  if (d.kind === 'column') {
    const o = columnOutline(d)
    return (
      <g data-testid="selection">
        <polygon
          points={o.map((q) => `${q.x},${q.y}`).join(' ')}
          {...common}
          strokeWidth={2 * px}
          fill="none"
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

/**
 * Cursor estilo CAD: cruz em tela cheia + caixa de seleção (modo seleção) e marcador do snap
 * (quadrado = extremidade, triângulo = ponto médio, x = grade). Em px de tela.
 */
function CadCursor({
  screen,
  snapAt,
  snapKind,
  pickbox,
}: {
  screen: Vec2 | null
  snapAt: Vec2 | null
  snapKind: SnapKind
  pickbox: boolean
}) {
  const snapColor = snapKind === 'endpoint' || snapKind === 'midpoint' ? UI.clay : UI.muted
  const r = 6
  return (
    <g pointerEvents="none" data-testid="cad-cursor">
      {screen && (
        <>
          <line
            x1={0}
            x2="100%"
            y1={screen.y}
            y2={screen.y}
            stroke={UI.muted}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          <line
            y1={0}
            y2="100%"
            x1={screen.x}
            x2={screen.x}
            stroke={UI.muted}
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          {pickbox && (
            <rect
              x={screen.x - 5}
              y={screen.y - 5}
              width={10}
              height={10}
              fill="none"
              stroke={UI.ink}
              strokeWidth={1}
            />
          )}
        </>
      )}
      {snapAt &&
        (snapKind === 'midpoint' ? (
          <polygon
            points={`${snapAt.x},${snapAt.y - r} ${snapAt.x + r},${snapAt.y + r * 0.7} ${snapAt.x - r},${snapAt.y + r * 0.7}`}
            fill="none"
            stroke={snapColor}
            strokeWidth={1.8}
            data-testid="snap-midpoint"
          />
        ) : snapKind === 'grid' || snapKind === 'free' || snapKind === 'ortho' ? (
          <path
            d={`M ${snapAt.x - 4} ${snapAt.y - 4} L ${snapAt.x + 4} ${snapAt.y + 4} M ${snapAt.x + 4} ${snapAt.y - 4} L ${snapAt.x - 4} ${snapAt.y + 4}`}
            stroke={snapColor}
            strokeWidth={1.5}
          />
        ) : (
          <rect
            x={snapAt.x - r}
            y={snapAt.y - r}
            width={2 * r}
            height={2 * r}
            fill="none"
            stroke={snapColor}
            strokeWidth={1.8}
            data-testid="snap-endpoint"
          />
        ))}
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
  /** Cursor em px de tela (cruz estilo CAD) e canto de parede sob o mouse. */
  const [cursorScreen, setCursorScreen] = useState<Vec2 | null>(null)
  const [hoverGrip, setHoverGrip] = useState<Vec2 | null>(null)
  const cadCursor = useUnits((s) => s.cadCursor)
  /** Área de seleção em px de tela (início e ponto atual). */
  const [band, setBand] = useState<{ a: Vec2; b: Vec2 } | null>(null)
  /** Parede em edição (para as cotas provisórias) e o deslocamento atual, já formatado. */
  const [editGuide, setEditGuide] = useState<{
    wallId: string
    vertex?: number
    segment?: number
  } | null>(null)
  const [dragDelta, setDragDelta] = useState<string | null>(null)
  const spaceDown = useRef(false)
  /** Movendo a vista (botão do meio/direito ou Espaço): cursor de "mão fechada". */
  const [panning, setPanning] = useState(false)
  const selected = useEditor((s) => s.selected)
  const stage = useEditor((s) => s.stage)
  /** O ambiente só com o que esta aba edita: clique, área de seleção e cantos usam ele. */
  const editEnv = useMemo(() => stageEnv(env, stage), [env, stage])
  const editable = useMemo(
    () => new Set([...editEnv.items, ...editEnv.drawings, ...editEnv.openings].map((o) => o.id)),
    [editEnv],
  )
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
    mode: 'pan' | 'move' | 'opening' | 'handle' | 'vertex' | 'segment' | 'band'
    /** Seleção por área: Shift soma à seleção atual. */
    additive?: boolean
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
    /** Edição de parede: canto (índice) ou trecho (índice + normal). */
    wallEdit?: { wallId: string; index: number; n?: Vec2 }
    /** Arrasto de canto: posição inicial e pontos de snap congelados (sem a própria parede). */
    vertexSnap?: { from: Vec2; endpoints: Vec2[]; midpoints: Vec2[]; angle: AngleConstraint[] }
  } | null>(null)

  const px = 1 / view.scale // 1 px de tela em mm do modelo
  const endpoints = useMemo(() => snapPoints(env), [env])
  const markers = useMemo(
    () => environmentMarkers({ items: env.items }, DISPLAY_SCALE),
    [env.items],
  )
  const selectedMarkers = useMemo(
    () =>
      selectedMarkerEntities(
        env,
        new Set(selected.filter((r) => r.kind === 'item').map((r) => r.id)),
        UI.clay,
      ),
    [env, selected],
  )
  const walls = useMemo(() => wallsOf(env), [env.drawings]) // eslint-disable-line react-hooks/exhaustive-deps
  const midpoints = useMemo(() => snapMidpoints(env), [env.drawings]) // eslint-disable-line react-hooks/exhaustive-deps
  const humanized = useUnits((s) => s.humanized)
  /** Pisos (por baixo dos móveis); só muda quando as áreas mudam. */
  const floors = useMemo(
    () =>
      env.drawings.flatMap((d) =>
        d.kind === 'area' && d.floor ? floorEntities(d.points, d.floor, humanized) : [],
      ),
    [env.drawings, humanized],
  )
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
      const w = walls.find((x) => x.id === hit.wallId)
      const center = w ? segmentCenterOffset(w, hit.segment) : null
      // Perto do meio do trecho, gruda no CENTRO exato; senão, passo de 1 cm.
      const offsetMm =
        center !== null && Math.abs(hit.along - center) <= CENTER_SNAP_PX * px
          ? Math.round(center)
          : Math.round(hit.along / GRID_MOVE) * GRID_MOVE
      return { wallId: hit.wallId, segment: hit.segment, offsetMm, side: hit.side, type }
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
    // Deixa livres as faixas dos elementos flutuantes: título e opções em cima, ferramentas e
    // rodapé embaixo.
    const top = el.clientHeight > 400 ? FLOAT_TOP : 0
    const bottom = el.clientHeight > 400 ? FLOAT_BOTTOM : 0
    const v = fit(
      { x: bb.minX, y: bb.minY, width: bb.maxX - bb.minX, height: bb.maxY - bb.minY },
      { width: el.clientWidth, height: el.clientHeight - top - bottom },
      24,
    )
    setView({ ...v, ty: v.ty + top })
  }, [])

  // Enquadrar ao abrir, ao trocar de ambiente e quando pedirem.
  useEffect(fitToContent, [fitToContent, env.id, fitSignal, env.basePlan?.assetId])

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
        midpoints: opts.free ? [] : midpoints,
        tolerance: 10 * px,
        orthoFrom: opts.free ? undefined : opts.ortho,
      }),
    [endpoints, midpoints, wallDraft, dimDraft, areaDraft, px],
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

  /** Pontos de snap para arrastar um canto: tudo menos a própria parede e o que está no canto. */
  const vertexSnapFor = (wallId: string, from: Vec2, index: number) => {
    const rest = { ...env, drawings: env.drawings.filter((x) => x.id !== wallId) }
    const away = (q: Vec2) => distance(q, from) > 1
    const w = env.drawings.find((x): x is Wall => x.id === wallId && x.kind === 'wall')
    return {
      from,
      endpoints: snapPoints(rest).filter(away),
      midpoints: snapMidpoints(rest).filter(away),
      // Auxiliar de ângulo reto: restrições pelos vizinhos (que não se mexem no arrasto)
      angle: w ? vertexConstraints(w.points, w.closed, index) : [],
    }
  }

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
      if (mod && key === 'a') {
        e.preventDefault()
        s.selectMany(allRefs(stageEnv(selectActiveEnv(s), s.stage)))
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
          if (s.selected.length) {
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
            case 'l':
              s.setTool('column')
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
    // Espaço segurado = mover a vista arrastando (como em programas de desenho).
    const onSpace = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.code !== 'Space' || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) return
      e.preventDefault()
      spaceDown.current = e.type === 'keydown'
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onSpace)
    window.addEventListener('keyup', onSpace)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keydown', onSpace)
      window.removeEventListener('keyup', onSpace)
    }
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
    // Uma seleção de texto que já existia (p. ex. arrastando no painel) não pode seguir pelo desenho.
    window.getSelection()?.removeAllRanges()
    if (e.button === 1 || e.button === 2 || spaceDown.current) {
      // Botão do meio (como no LibreCAD), direito ou Espaço: move a vista.
      e.preventDefault()
      drag.current = { mode: 'pan', last: sp, start: p, applied: { x: 0, y: 0 } }
      setPanning(true)
      return
    }
    switch (s.tool) {
      case 'select': {
        // Canto de QUALQUER parede sob o mouse: arrasta direto (como os grips do CAD).
        const grip = nearestWallVertex(
          editEnv,
          p,
          8 * px,
          s.selection?.kind === 'drawing' ? s.selection.id : undefined,
        )
        if (grip) {
          s.select({ kind: 'drawing', id: grip.wallId })
          setEditGuide({ wallId: grip.wallId, vertex: grip.index })
          s.beginInteraction()
          drag.current = {
            mode: 'vertex',
            last: sp,
            start: p,
            applied: { x: 0, y: 0 },
            wallEdit: { wallId: grip.wallId, index: grip.index },
            vertexSnap: vertexSnapFor(grip.wallId, grip.at, grip.index),
          }
          break
        }
        // Alças da parede selecionada (cantos e meio dos trechos) vêm primeiro.
        const selWall =
          s.selection?.kind === 'drawing'
            ? (env.drawings.find((x) => x.id === s.selection!.id && x.kind === 'wall') as
                Wall | undefined)
            : undefined
        if (selWall) {
          const hh = wallHandles(selWall)
          const vi = hh.vertices.findIndex((v) => distance(v, p) <= 8 * px)
          const mi = vi < 0 ? hh.mids.find((m) => distance(m.at, p) <= 8 * px) : undefined
          if (vi >= 0 || mi) {
            setEditGuide(
              vi >= 0
                ? { wallId: selWall.id, vertex: vi }
                : { wallId: selWall.id, segment: mi!.seg },
            )
            s.beginInteraction()
            drag.current = {
              mode: vi >= 0 ? 'vertex' : 'segment',
              last: sp,
              start: p,
              applied: { x: 0, y: 0 },
              wallEdit:
                vi >= 0
                  ? { wallId: selWall.id, index: vi }
                  : { wallId: selWall.id, index: mi!.seg, n: mi!.n },
              vertexSnap: vi >= 0 ? vertexSnapFor(selWall.id, hh.vertices[vi]!, vi) : undefined,
            }
            break
          }
        }
        // Balões e rótulos de área têm prioridade: arrastá-los não mexe no item/área.
        const handle = hitHandle(editEnv, p, 4 * px)
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
        const hit = hitTest(editEnv, p, 6 * px)
        if (hit && e.shiftKey) {
          s.toggleSelect(hit)
          break
        }
        const inGroup =
          !!hit &&
          s.selected.length > 1 &&
          s.selected.some((r) => r.kind === hit.kind && r.id === hit.id)
        if (!inGroup) s.select(hit)
        if (hit) {
          s.beginInteraction()
          const o = hit.kind === 'opening' ? env.openings.find((x) => x.id === hit.id) : undefined
          const grab = o && openingTarget(p, o.type, 1500)
          drag.current = {
            mode: hit.kind === 'opening' && !inGroup ? 'opening' : 'move',
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
          // Vazio: área de seleção (esq.→dir. = janela; dir.→esq. = cruzamento).
          drag.current = {
            mode: 'band',
            last: sp,
            start: p,
            applied: { x: 0, y: 0 },
            additive: e.shiftKey,
          }
          setBand({ a: sp, b: sp })
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
      case 'column': {
        const c = columnPlacement(env, p, 10 * px)
        s.addColumn(c.at, c.rotationDeg)
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
    setCursorScreen(sp)
    if (s.tool === 'select' && !d) {
      setHoverGrip(nearestWallVertex(editEnv, p, 8 * px)?.at ?? null)
    } else if (hoverGrip) {
      setHoverGrip(null)
    }
    if (d?.mode === 'band') {
      setBand((b) => (b ? { a: b.a, b: sp } : b))
      return
    }
    if (d?.mode === 'pan') {
      // O deslocamento é calculado AGORA: o atualizador do setView roda depois, quando
      // `d.last` já foi trocado (com ele dentro, o deslocamento dava sempre zero).
      const dx = sp.x - d.last.x
      const dy = sp.y - d.last.y
      setView((v) => pan(v, dx, dy))
      d.last = sp
    } else if (d?.mode === 'vertex' && d.wallEdit && d.vertexSnap) {
      const we = d.wallEdit
      const vs = d.vertexSnap
      // Move pelo DESLOCAMENTO (passo de 1 cm a partir de onde o canto estava); gruda em
      // cantos/meios de outras paredes quando passa perto. Shift = livre.
      const moved = {
        x: vs.from.x + Math.round((p.x - d.start.x) / GRID_MOVE) * GRID_MOVE,
        y: vs.from.y + Math.round((p.y - d.start.y) / GRID_MOVE) * GRID_MOVE,
      }
      let r: { point: Vec2; kind: SnapKind } = e.shiftKey
        ? { point: { x: Math.round(p.x), y: Math.round(p.y) }, kind: 'free' as const }
        : snapPoint(moved, {
            grid: 0,
            endpoints: vs.endpoints,
            midpoints: vs.midpoints,
            tolerance: 10 * px,
          })
      // Sem canto/meio de outra parede por perto: gruda no esquadro (90°) ou no alinhamento.
      if (!e.shiftKey && r.kind !== 'endpoint' && r.kind !== 'midpoint') {
        const ra = rightAngleSnap(moved, vs.angle, 10 * px)
        if (ra) r = { point: ra.point, kind: 'right' }
      }
      setCursor(r.point)
      setSnapKind(r.kind)
      s.editWalls((ws) => moveVertexLinked(ws, we.wallId, we.index, r.point))
      const dx = r.point.x - vs.from.x
      const dy = r.point.y - vs.from.y
      setDragDelta(
        `Δx ${formatLength(dx, wallUnit)} · Δy ${formatLength(dy, wallUnit)} ${UNIT_LABEL[wallUnit]}`,
      )
    } else if (d?.mode === 'segment' && d.wallEdit?.n) {
      const we = d.wallEdit
      const want = Math.round(dot(sub(p, d.start), we.n!) / GRID_MOVE) * GRID_MOVE
      const delta = want - d.applied.x
      if (delta !== 0) {
        s.editWalls((ws) => pushSegmentLinked(ws, we.wallId, we.index, delta))
        d.applied = { x: want, y: 0 }
        setDragDelta(`parede empurrada ${formatLength(want, wallUnit)} ${UNIT_LABEL[wallUnit]}`)
      }
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
        let offsetMm = sameSegment ? g.offsetMm + (t.offsetMm - g.grabAlong) : t.offsetMm
        const host = walls.find((x) => x.id === t.wallId)
        const center = host ? segmentCenterOffset(host, t.segment) : null
        if (center !== null && Math.abs(offsetMm - center) <= CENTER_SNAP_PX * px)
          offsetMm = Math.round(center)
        s.updateOpening(o.id, { wallId: t.wallId, segment: t.segment, offsetMm })
      }
    }
    // Arrastando canto: o cursor/snap já foi definido acima.
    if (d?.mode === 'vertex') return
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
    } else if (s.tool === 'column') {
      setCursor(columnPlacement(env, p, 10 * px).at)
    } else if (s.tool === 'place' || s.tool === 'room') {
      setCursor(snap(p, { grid: s.tool === 'room' ? GRID_DRAW : GRID_MOVE }).point)
      setSnapKind('grid')
    } else {
      setCursor(p)
      setSnapKind('free')
    }
  }

  const onPointerUp = () => {
    setPanning(false)
    const dd = drag.current
    if (dd?.mode === 'band' && band) {
      const tiny = Math.abs(band.b.x - band.a.x) < 4 && Math.abs(band.b.y - band.a.y) < 4
      const st = useEditor.getState()
      if (tiny) {
        if (!dd.additive) st.select(null)
      } else {
        const r = rectFromCorners(screenToWorld(view, band.a), screenToWorld(view, band.b))
        const mode = band.b.x >= band.a.x ? 'window' : 'crossing'
        st.selectMany(refsInRect(editEnv, r, mode), dd.additive)
      }
      setBand(null)
      drag.current = null
      return
    }
    setEditGuide(null)
    setDragDelta(null)
    if (
      drag.current?.mode === 'move' ||
      drag.current?.mode === 'opening' ||
      drag.current?.mode === 'handle' ||
      drag.current?.mode === 'vertex' ||
      drag.current?.mode === 'segment'
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
    if (editGuide) {
      const w = walls.find((x) => x.id === editGuide.wallId)
      if (w) {
        const corners =
          editGuide.vertex !== undefined
            ? [editGuide.vertex - 1, editGuide.vertex, editGuide.vertex + 1]
            : [editGuide.segment!, editGuide.segment! + 1]
        return [
          ...wallEditGuides(w, editGuide, DRAFT),
          ...cornerAngleMarks(w, corners, DRAFT, UI.sage),
        ]
      }
    }
    // Parede selecionada: mostra em graus os cantos fora do esquadro.
    if (tool === 'select' && selection?.kind === 'drawing') {
      const w = walls.find((x) => x.id === selection.id)
      if (w)
        return cornerAngleMarks(
          w,
          w.points.map((_, i) => i),
          UI.muted,
          UI.sage,
          true,
        )
    }
    if (tool === 'select' && selection?.kind === 'opening') {
      const o = env.openings.find((x) => x.id === selection.id)
      const w = o && walls.find((x) => x.id === o.wallId)
      if (o && w) return openingGuides(w, o, o.side, DRAFT)
    }
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
          fill: { color: UI.white },
        },
        ...openingEntities(w, ghost),
        ...openingGuides(w, ghost, t.side, DRAFT),
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
    if (tool === 'column' && cursor) {
      const c = columnPlacement(env, cursor, 1)
      return columnEntities(
        { id: '_', kind: 'column', ...COLUMN_DEFAULTS, at: c.at, rotationDeg: c.rotationDeg },
        DRAFT,
      )
    }
    return []
  }, [
    tool,
    cursor,
    env,
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
    selection,
    editGuide,
  ])

  const gridMinorVisible = view.scale * 100 >= 6

  const hint: Hint = {
    select: [
      { t: 'arraste no vazio para selecionar' },
      { k: 'Shift', t: 'soma' },
      { k: 'Ctrl+A', t: 'tudo' },
      { k: 'R', t: 'gira' },
      { k: 'M', t: 'espelha' },
      { k: 'Del', t: 'exclui' },
      { k: 'Espaço', t: 'vista' },
    ],
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
    column:
      'Clique para inserir o pilar (20 × 20 cm) · num canto ou numa parede ele centraliza e gira junto · Esc termina',
    area: areaDraft.length
      ? `Clique nos cantos · clique no 1º ponto ou Enter fecha · ${areaDraft.length >= 2 && cursor ? areaM2Text({ points: [...areaDraft, cursor] }) : ''}`
      : 'Clique nos cantos da área (snap nas faces das paredes) · Q',
    place: 'Clique para inserir o bloco · Esc cancela',
    calibrate: 'Clique em dois pontos de medida conhecida da planta base',
  }[tool]

  /** Zoom pelos botões, em torno do centro da vista. */
  const zoomBy = (factor: number) => {
    const el = ref.current
    if (!el) return
    setView((v) => zoomAt(v, factor, { x: el.clientWidth / 2, y: el.clientHeight / 2 }))
  }

  return (
    <div className="plan-canvas">
      <svg
        ref={ref}
        className={`canvas canvas--${tool} ${cadCursor ? 'canvas--cad' : ''} ${panning ? 'canvas--panning' : ''}`}
        data-testid="plan-canvas"
        data-view={`${view.scale} ${view.tx} ${view.ty}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // No Windows, o botão do meio liga a "rolagem automática" do Chrome/Edge (que toma conta
        // do mouse) e no Linux cola o texto copiado: o desenho cancela essas ações.
        onMouseDown={(e) => {
          if (e.button === 1) e.preventDefault()
        }}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault()
        }}
        onPointerLeave={() => {
          setCursor(null)
          setCursorScreen(null)
          setHoverGrip(null)
        }}
        onDoubleClick={(e) => {
          if (tool === 'wall' && wallDraft.length >= 2) commitWall(wallDraft, false)
          if (tool === 'area' && areaDraft.length >= 3) commitArea(areaDraft)
          if (tool === 'select' && selection?.kind === 'drawing') {
            const w = env.drawings.find((x) => x.id === selection.id && x.kind === 'wall') as
              Wall | undefined
            if (!w) return
            const p = toModel(e)
            const vi = vertexAt(w, p, 8 * px)
            if (vi >= 0) {
              useEditor.getState().editWall(w.id, (x) => removeVertex(x, vi))
            } else if (hitWall(w, p, 4 * px)) {
              const near = nearestWall([w], p, w.thicknessMm)
              if (near) useEditor.getState().editWall(w.id, (x) => insertVertex(x, near.segment, p))
            }
          }
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
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke={UI.gridMinor} strokeWidth={px} />
          </pattern>
          <pattern id="grid-major" width={1000} height={1000} patternUnits="userSpaceOnUse">
            {gridMinorVisible && <rect width={1000} height={1000} fill="url(#grid-minor)" />}
            <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke={UI.gridMajor} strokeWidth={px} />
          </pattern>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect x={-100000} y={-100000} width={200000} height={200000} fill={UI.canvas} />
          <rect x={-100000} y={-100000} width={200000} height={200000} fill="url(#grid-major)" />
          <BasePlanView env={env} />
          <g data-testid="floors-layer">
            <Compiled entities={floors} role="pisos" />
          </g>
          <g data-testid="items">
            {itemsInDrawOrder(env.items).map((it) => (
              <ItemView key={it.id} item={it} humanized={humanized} dim={!editable.has(it.id)} />
            ))}
          </g>
          <g data-testid="drawings">
            <WallsView walls={walls} openings={env.openings} />
            {env.drawings
              .filter((d) => d.kind !== 'wall')
              .map((d) => (
                <DrawingView
                  key={d.id}
                  d={d}
                  openings={NO_OPENINGS}
                  // Pilares são estrutura: sempre aparecem inteiros, como as paredes.
                  dim={d.kind !== 'column' && !editable.has(d.id)}
                />
              ))}
          </g>
          <Compiled
            entities={markers}
            role="marcadores"
            opacity={stage === 'layout' || stage === 'marcenaria' ? undefined : DIMMED}
          />
          <Compiled entities={selectedMarkers} role="marcador-selecionado" />
          <g data-testid={editGuide ? 'edit-guides' : 'draft'}>
            <Compiled entities={draftEntities} opacity={tool === 'place' ? 0.55 : 0.85} />
          </g>
          {selected.length > 1 ? (
            selected.map((r) => (
              <SelectionOverlay key={`${r.kind}:${r.id}`} env={env} sel={r} px={px} />
            ))
          ) : (
            <SelectionOverlay env={env} sel={selection} px={px} />
          )}
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
                  stroke={UI.brick}
                  strokeWidth={2 * px}
                />
                {i === 1 && (
                  <line
                    x1={calibration[0]!.x}
                    y1={calibration[0]!.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={UI.brick}
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
              fill={typed ? UI.brick : DRAFT}
              data-testid="typed-length"
            >
              {typed
                ? `${typed} ${UNIT_LABEL[wallUnit]} ↵`
                : `digite o comprimento (${UNIT_LABEL[wallUnit]})`}
            </text>
          )}
          {hoverGrip && (
            <rect
              x={hoverGrip.x - 6 * px}
              y={hoverGrip.y - 6 * px}
              width={12 * px}
              height={12 * px}
              fill={UI.clay}
              stroke={UI.white}
              strokeWidth={px}
              data-testid="hover-grip"
            />
          )}
        </g>
        {band && (
          <rect
            x={Math.min(band.a.x, band.b.x)}
            y={Math.min(band.a.y, band.b.y)}
            width={Math.abs(band.b.x - band.a.x)}
            height={Math.abs(band.b.y - band.a.y)}
            fill={band.b.x >= band.a.x ? UI.claySoft : UI.sageSoft}
            stroke={band.b.x >= band.a.x ? UI.clay : UI.sage}
            strokeDasharray={band.b.x >= band.a.x ? undefined : '6 4'}
            pointerEvents="none"
            data-testid="selection-band"
          />
        )}
        <CadCursor
          screen={cadCursor && !panning ? cursorScreen : null}
          snapAt={
            cursor &&
            (tool === 'wall' ||
              tool === 'dimension' ||
              tool === 'area' ||
              (tool === 'select' && (snapKind === 'endpoint' || snapKind === 'midpoint')))
              ? worldToScreen(view, cursor)
              : null
          }
          snapKind={snapKind}
          pickbox={tool === 'select'}
        />
      </svg>
      <footer className="statusbar" data-testid="editor-status">
        <span className="statusbar__coords">
          {cursor
            ? `x ${formatLength(cursor.x, wallUnit)} · y ${formatLength(cursor.y, wallUnit)} ${UNIT_LABEL[wallUnit]}`
            : '—'}
        </span>
        {snapKind === 'endpoint' && <span>snap: extremidade</span>}
        {snapKind === 'midpoint' && <span>snap: ponto médio</span>}
        {snapKind === 'right' && <span data-testid="snap-right">snap: esquadro (90°)</span>}
        {snapKind === 'ortho' && <span>snap: ortogonal</span>}
        {dragDelta && (
          <span className="statusbar__delta" data-testid="drag-delta">
            {dragDelta}
          </span>
        )}
        <span className="statusbar__hint">
          {typeof hint === 'string'
            ? hint
            : hint.map((h, i) => (
                <span key={i}>
                  {h.k && <kbd>{h.k}</kbd>}
                  {h.t}
                </span>
              ))}
        </span>
        <span className="zoom" data-testid="zoom">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.25)}
            aria-label="Afastar"
            title="Afastar"
          >
            <Minus size={13} strokeWidth={1.5} />
          </button>
          <span title="100% = escala 1:50 em tamanho real na tela">
            {Math.round((view.scale / SCALE_100) * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            aria-label="Aproximar"
            title="Aproximar"
          >
            <Plus size={13} strokeWidth={1.5} />
          </button>
        </span>
      </footer>
    </div>
  )
}

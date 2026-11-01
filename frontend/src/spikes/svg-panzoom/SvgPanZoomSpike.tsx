import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { randomLines, type LineMm } from './lines'
import { fit, pan, screenToWorld, zoomAt, type Viewport } from './viewport'

const WORLD = { x: 0, y: 0, width: 20000, height: 15000 } // 20 × 15 m, em mm
const LINE_COUNT = 2000

const Lines = memo(function Lines({ lines }: { lines: LineMm[] }) {
  return (
    <g stroke="#1f3a5f" strokeWidth={1} vectorEffect="non-scaling-stroke">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  )
})

function useFps() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    const loop = (t: number) => {
      frames++
      if (t - last >= 500) {
        setFps(Math.round((frames * 1000) / (t - last)))
        frames = 0
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

export default function SvgPanZoomSpike() {
  const svgRef = useRef<SVGSVGElement>(null)
  const lines = useMemo(() => randomLines(LINE_COUNT, WORLD.width, WORLD.height), [])
  const [view, setView] = useState<Viewport>({ scale: 0.04, tx: 24, ty: 24 })
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const fps = useFps()

  const fitToScreen = () => {
    const el = svgRef.current
    if (el) setView(fit(WORLD, { width: el.clientWidth, height: el.clientHeight }))
  }

  useEffect(fitToScreen, [])

  // onWheel do React é passivo; precisamos de preventDefault para não rolar a página.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * 0.0015)
      setView((v) => zoomAt(v, factor, { x: e.clientX - rect.left, y: e.clientY - rect.top }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const local = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <section className="spike">
      <header className="spike__header">
        <h1>Spike: SVG com pan/zoom ({LINE_COUNT.toLocaleString('pt-BR')} linhas)</h1>
        <div className="toolbar">
          <button
            type="button"
            onClick={() => setView((v) => zoomAt(v, 1.25, center(svgRef.current)))}
          >
            Zoom +
          </button>
          <button
            type="button"
            onClick={() => setView((v) => zoomAt(v, 0.8, center(svgRef.current)))}
          >
            Zoom −
          </button>
          <button type="button" onClick={fitToScreen}>
            Enquadrar
          </button>
        </div>
      </header>
      <div className="spike__body">
        <svg
          ref={svgRef}
          className="canvas"
          data-testid="panzoom-canvas"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = local(e)
          }}
          onPointerMove={(e) => {
            const p = local(e)
            setCursor(screenToWorld(view, p))
            if (drag.current) {
              const d = drag.current
              drag.current = p
              setView((v) => pan(v, p.x - d.x, p.y - d.y))
            }
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => setCursor(null)}
        >
          <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
            <rect
              x={WORLD.x}
              y={WORLD.y}
              width={WORLD.width}
              height={WORLD.height}
              fill="#fff"
              stroke="#c8c2b4"
              vectorEffect="non-scaling-stroke"
            />
            <Lines lines={lines} />
          </g>
        </svg>
        <footer className="statusbar" data-testid="panzoom-status">
          <span>{fps} fps</span>
          <span>zoom {(view.scale * 1000).toFixed(1)} px/m</span>
          <span>
            {cursor
              ? `x ${(cursor.x / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm · y ${(cursor.y / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`
              : '—'}
          </span>
          <span>Arraste para mover · roda do mouse para zoom</span>
        </footer>
      </div>
    </section>
  )
}

function center(el: SVGSVGElement | null) {
  return el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : { x: 0, y: 0 }
}

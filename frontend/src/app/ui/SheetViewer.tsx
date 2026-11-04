import { useCallback, useEffect, useRef, useState } from 'react'
import { fit, pan, pinch, screenToWorld, zoomAt, type Viewport } from '@/core/geometry/viewport'
import type { Vec2 } from '@/core/geometry/vec'
import type { SvgNode } from '@/render/svg/svg-node'
import { SvgNodeView } from '@/render/svg/SvgNodeView'

/** 1 mm em px CSS (96 dpi): zoom "tamanho real". */
const PX_PER_MM = 96 / 25.4

interface Props {
  sheet: SvgNode
  widthMm: number
  heightMm: number
}

/** Mostra uma folha (SVG em mm de papel) com pan/zoom; o "mundo" é o mm de papel. */
export function SheetViewer({ sheet, widthMm, heightMm }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<Viewport>({ scale: 2, tx: 20, ty: 20 })
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const pointers = useRef(new Map<number, Vec2>())

  const fitSheet = useCallback(() => {
    const el = ref.current
    if (el)
      setView(
        fit(
          { x: 0, y: 0, width: widthMm, height: heightMm },
          { width: el.clientWidth, height: el.clientHeight },
          16,
        ),
      )
  }, [widthMm, heightMm])

  useEffect(fitSheet, [fitSheet])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(fitSheet)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitSheet])

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

  const center = () => {
    const el = ref.current
    return el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : { x: 0, y: 0 }
  }
  const local = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  return (
    <div className="viewer">
      <div className="toolbar">
        <button type="button" onClick={() => setView((v) => zoomAt(v, 1.25, center()))}>
          Zoom +
        </button>
        <button type="button" onClick={() => setView((v) => zoomAt(v, 0.8, center()))}>
          Zoom −
        </button>
        <button type="button" onClick={fitSheet}>
          Enquadrar
        </button>
        <button
          type="button"
          title="1 mm do papel = 1 mm na tela (aprox., 96 dpi)"
          onClick={() => setView((v) => zoomAt(v, PX_PER_MM / v.scale, center()))}
        >
          Tamanho real
        </button>
      </div>
      <svg
        ref={ref}
        className="canvas"
        data-testid="sheet-canvas"
        data-view={`${view.scale} ${view.tx} ${view.ty}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pointers.current.set(e.pointerId, local(e))
        }}
        onPointerMove={(e) => {
          const p = local(e)
          setCursor(screenToWorld(view, p))
          if (pointers.current.has(e.pointerId)) {
            const previous = [...pointers.current.values()]
            const from = pointers.current.get(e.pointerId)!
            pointers.current.set(e.pointerId, p)
            const next = [...pointers.current.values()]
            setView((v) =>
              next.length >= 2
                ? pinch(v, [previous[0]!, previous[1]!], [next[0]!, next[1]!])
                : pan(v, p.x - from.x, p.y - from.y),
            )
          }
        }}
        onPointerUp={(e) => pointers.current.delete(e.pointerId)}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onLostPointerCapture={(e) => pointers.current.delete(e.pointerId)}
        onPointerLeave={() => setCursor(null)}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
          <rect x={0.8} y={0.8} width={widthMm} height={heightMm} fill="rgba(0,0,0,0.12)" />
          <SvgNodeView node={sheet} width={widthMm} height={heightMm} data-testid="sheet" />
        </g>
      </svg>
      <footer className="statusbar" data-testid="viewer-status">
        <span>zoom {Math.round((view.scale / PX_PER_MM) * 100)}%</span>
        <span>
          {cursor
            ? `papel x ${cursor.x.toFixed(1).replace('.', ',')} mm · y ${cursor.y.toFixed(1).replace('.', ',')} mm`
            : '—'}
        </span>
        <span className="mouse-help">Arraste para mover · roda do mouse para zoom</span>
        <span className="touch-help">Arraste para mover · pinça para zoom</span>
      </footer>
    </div>
  )
}

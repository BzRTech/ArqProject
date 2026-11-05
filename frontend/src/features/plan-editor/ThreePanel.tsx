import { useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { environmentScene, itemGroup, sceneFrame } from '@/core/scene/environment'
import type { Scene, Triple } from '@/core/scene/model'
import { SceneView } from '@/render/three/SceneView'
import { selectActiveEnv, useEditor } from './store'
import { useRuleProfile } from './rules'
import { useLibrary } from '@/features/library/library-store'
import { savePerspective } from './save-perspective'

export default function ThreePanel() {
  const env = useEditor(selectActiveEnv)
  const projectName = useEditor((s) => s.project.name)
  const rules = useRuleProfile()
  const joineryTypes = useLibrary((s) => s.lib['joinery-types'])
  const [itemId, setItemId] = useState('')
  const [open, setOpen] = useState(false)
  const [walls, setWalls] = useState(true)
  const [reset, setReset] = useState(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const item = env.items.find((it) => it.id === itemId)
  const scene = useMemo((): Scene => {
    if (item)
      return {
        groups: [
          { ...itemGroup(item, rules, open, joineryTypes), center: [0, 0, 0], rotationY: 0 },
        ],
        slabs: [],
      }
    const result = environmentScene(env, rules, open, joineryTypes)
    return walls ? result : { ...result, slabs: result.slabs.filter((s) => s.bottom < 0) }
  }, [env, item, rules, open, walls, joineryTypes])
  const itemHeight = Math.max(
    1,
    ...scene.groups.flatMap((g) => g.boxes.map((b) => b.center[1] + b.size[1] / 2)),
  )
  const frame = item
    ? {
        target: [0, itemHeight / 2, 0] as Triple,
        span: Math.max(item.sizeMm.w, item.sizeMm.d, itemHeight) * 1.35,
      }
    : sceneFrame(env)
  const capture = (pdf: boolean) => {
    if (!canvas.current) return
    try {
      const image = canvas.current.toDataURL('image/png')
      const name = `${env.name}-${item?.name ?? 'ambiente'}-perspectiva`
      if (pdf) {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
        doc.setFontSize(16)
        doc.text(`${projectName} · ${env.name}`, 15, 20)
        doc.setFontSize(11)
        doc.text(
          `${item?.name ?? 'Ambiente'} · Perspectiva ${open ? 'aberta' : 'fechada'} · Sem escala`,
          15,
          29,
        )
        const ratio = canvas.current.width / canvas.current.height
        const w = Math.min(390, 240 * ratio),
          h = w / ratio
        doc.addImage(image, 'PNG', (420 - w) / 2, 38 + (240 - h) / 2, w, h)
        doc.save(`${name}.pdf`)
      } else {
        const a = document.createElement('a')
        a.href = image
        a.download = `${name}.png`
        a.click()
      }
      setError('')
    } catch {
      setError('Não foi possível capturar a perspectiva. Tente reabrir o 3D.')
    }
  }
  return (
    <div className="three-panel" data-testid="three-panel">
      <div className="three-panel__controls">
        <label>
          Vista{' '}
          <select
            aria-label="Vista 3D"
            value={item?.id ?? ''}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">Ambiente completo</option>
            {env.items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Abrir
          portas e gavetas
        </label>
        {!item && (
          <label>
            <input type="checkbox" checked={walls} onChange={(e) => setWalls(e.target.checked)} />{' '}
            Paredes e pilares
          </label>
        )}
        <button type="button" onClick={() => setReset((n) => n + 1)}>
          Enquadrar 3D
        </button>
        <button type="button" disabled={!ready} onClick={() => capture(false)}>
          Capturar PNG
        </button>
        <button type="button" disabled={!ready} onClick={() => capture(true)}>
          Prancha de perspectiva (PDF)
        </button>
        <button
          type="button"
          disabled={!ready || saving}
          onClick={async () => {
            if (!canvas.current || saving) return
            setSaving(true)
            try {
              await savePerspective(
                canvas.current,
                `${item?.name ?? env.name} · ${open ? 'Aberta' : 'Fechada'}`,
              )
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Não foi possível salvar a perspectiva.')
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Salvando perspectiva…' : 'Salvar perspectiva nas pranchas'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="three-panel__canvas" data-testid="scene-canvas">
        <SceneView
          key={`${env.id}-${item?.id ?? 'env'}-${reset}`}
          scene={scene}
          target={frame.target}
          span={frame.span}
          onCanvas={(el) => {
            canvas.current = el
            setReady(true)
          }}
        />
      </div>
      <p className="three-panel__hint">
        <span className="mouse-help">
          Arraste para girar · botão direito para mover · roda para aproximar.{' '}
        </span>
        <span className="touch-help">
          Um dedo para girar · dois dedos para mover · pinça para aproximar.{' '}
        </span>
        Móveis detalhados mostram as peças e os acabamentos escolhidos. Os itens do catálogo têm
        modelos 3D proporcionais às medidas da planta.
      </p>
    </div>
  )
}

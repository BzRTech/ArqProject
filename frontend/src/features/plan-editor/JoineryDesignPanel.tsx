import { getBlock } from '@/core/blocks/catalog'
import { useLibrary } from '@/features/library/library-store'
import { AlertTriangle, Eye, Info, Map as MapIcon, Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { normalizeModules, equalizeDoors, solveJoinery } from '@/core/joinery/solve'
import { validateJoinery } from '@/core/joinery/validate'
import {
  FRONT_KINDS,
  HANDLE_KINDS,
  type FrontKind,
  type HandleKind,
  type Item,
  type JoineryDesign,
} from '@/core/project/schema'
import { formatCm } from '@/core/units'
import { LengthField } from './fields'
import { useRuleProfile } from './rules'
import { useEditor } from './store'
import { useUnits } from './units-pref'

const FRONT_LABEL: Record<FrontKind, string> = {
  open: 'Aberto (nicho)',
  door1: '1 porta',
  door2: '2 portas',
  drawers: 'Gavetas',
}
const HANDLE_LABEL: Record<HandleKind, string> = {
  touch: 'Fecho toque (sem puxador)',
  bar: 'Barra',
  profile: 'Perfil de alumínio',
  cava: 'Cava embutida',
  knob: 'Botão',
}
const BASE_LABEL = { floor: 'Direto no piso', suspended: 'Suspenso', plinth: 'Rodapé' } as const

/**
 * Aba Marcenaria: o desenho do móvel (medidas, base, módulos, frentes, puxador), com os avisos
 * de conferência técnica e a lista de peças. As vistas cotadas ficam no centro ("Ver vistas").
 */
export function JoineryDesignPanel({ item }: { item: Item }) {
  const rules = useRuleProfile()
  const unit = useUnits((u) => u.item)
  const detailOpen = useEditor((s) => s.detailItemId === item.id)
  const s = useEditor.getState()
  const design = item.joinery?.design
  const W = item.sizeMm.w
  const solved = useMemo(
    () => (design ? solveJoinery({ w: W, d: item.sizeMm.d }, design, rules) : null),
    [design, W, item.sizeMm.d, rules],
  )
  const warnings = useMemo(() => (solved ? validateJoinery(solved, rules) : []), [solved, rules])
  // Puxadores e modelos prontos do banco em uso.
  const lib = useLibrary((l) => l.lib)
  const handles = lib.handles
  const joineryType = getBlock(item.blockId, item.blockVersion).joineryType
  const presets = useMemo(
    () => lib.presets.filter((p) => !joineryType || p.joineryType === joineryType),
    [lib.presets, joineryType],
  )

  if (!design || !solved) {
    return (
      <section data-testid="joinery-design">
        <h2>Detalhamento</h2>
        <p className="muted small">
          Módulos, portas, gavetas e prateleiras, com as vistas cotadas e a prancha de detalhe.
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => s.openDetail(item.id)}
          data-testid="detail-start"
        >
          Detalhar este móvel
        </button>
      </section>
    )
  }

  const set = (d: JoineryDesign) => s.setJoineryDesign(item.id, d)
  // Larguras sempre somando a largura do móvel (se o móvel mudou na planta, ajusta aqui)
  const widths = normalizeModules(
    design.modules.map((m) => m.widthMm),
    W,
  )
  const setModule = (i: number, patch: Partial<JoineryDesign['modules'][number]>) =>
    set({
      ...design,
      modules: design.modules.map((m, k) => ({
        ...m,
        widthMm: widths[k]!,
        ...(k === i ? patch : {}),
      })),
    })
  const setWidth = (i: number, w: number) => {
    // O módulo seguinte (ou o anterior, no último) absorve a diferença
    const next = [...widths]
    const j = i < next.length - 1 ? i + 1 : i - 1
    if (j < 0) return
    const delta = w - next[i]!
    if (next[j]! - delta < 1) return
    next[i] = w
    next[j]! -= delta
    set({ ...design, modules: design.modules.map((m, k) => ({ ...m, widthMm: next[k]! })) })
  }
  const equalWidths = () => {
    const n = design.modules.length
    const base = Math.floor(W / n)
    set({
      ...design,
      modules: design.modules.map((m, k) => ({
        ...m,
        widthMm: base + (k === n - 1 ? W - base * n : 0),
      })),
    })
  }
  const roundToCm = () => {
    const r = widths.map((w) => Math.round(w / 10) * 10)
    r[r.length - 1]! += W - r.reduce((a, b) => a + b, 0)
    set({ ...design, modules: design.modules.map((m, k) => ({ ...m, widthMm: r[k]! })) })
  }
  const addModule = () => {
    const last = widths.length - 1
    const half = Math.floor(widths[last]! / 2)
    const next = [...widths.slice(0, last), widths[last]! - half, half]
    set({
      ...design,
      modules: [...design.modules, { ...design.modules[last]! }].map((m, k) => ({
        ...m,
        widthMm: next[k]!,
      })),
    })
  }
  const removeModule = (i: number) => {
    if (design.modules.length < 2) return
    const next = widths.filter((_, k) => k !== i)
    next[Math.min(i, next.length - 1)]! += widths[i]!
    set({
      ...design,
      modules: design.modules
        .filter((_, k) => k !== i)
        .map((m, k) => ({ ...m, widthMm: next[k]! })),
    })
  }

  return (
    <section data-testid="joinery-design">
      <div className="panel-head">
        <h2>Detalhamento</h2>
        <button
          type="button"
          className="sm"
          onClick={() => (detailOpen ? s.closeDetail() : s.openDetail(item.id))}
          data-testid="detail-toggle"
        >
          {detailOpen ? (
            <MapIcon size={14} strokeWidth={1.5} />
          ) : (
            <Eye size={14} strokeWidth={1.5} />
          )}
          {detailOpen ? 'Voltar à planta' : 'Ver vistas'}
        </button>
      </div>

      {warnings.length > 0 && (
        <ul className="warnings" data-testid="joinery-warnings">
          {warnings.map((w) => (
            <li key={w.code} className={`warning warning--${w.level}`}>
              {w.level === 'info' ? (
                <Info size={14} strokeWidth={1.5} />
              ) : (
                <AlertTriangle size={14} strokeWidth={1.5} />
              )}
              <span>{w.text}</span>
              {w.action === 'equalize-doors' && (
                <button
                  type="button"
                  className="sm"
                  onClick={() => set(equalizeDoors(W, design, rules))}
                  data-testid="equalize-doors"
                >
                  Igualar portas
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3>Medidas</h3>
      <p className="small muted">
        L × P vêm da planta ({formatCm(W)} × {formatCm(item.sizeMm.d)} cm). Altura e base:
      </p>
      <div className="field-row">
        <LengthField
          label="Altura do móvel"
          unit={unit}
          value={design.heightMm}
          onCommit={(heightMm) => set({ ...design, heightMm })}
          testId="joinery-h"
        />
        <label className="field">
          <span>Base</span>
          <select
            value={design.base.kind}
            onChange={(e) => {
              const kind = e.target.value as JoineryDesign['base']['kind']
              set({
                ...design,
                base: { kind, heightMm: kind === 'floor' ? 0 : design.base.heightMm || 100 },
              })
            }}
            data-testid="joinery-base"
          >
            {Object.entries(BASE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      {design.base.kind !== 'floor' && (
        <LengthField
          label={
            design.base.kind === 'suspended' ? 'Altura do piso até o móvel' : 'Altura do rodapé'
          }
          unit={unit}
          value={design.base.heightMm}
          onCommit={(heightMm) => set({ ...design, base: { ...design.base, heightMm } })}
          testId="joinery-base-h"
        />
      )}

      <h3>Módulos (largura eixo a eixo)</h3>
      <ol className="modules" data-testid="joinery-modules">
        {design.modules.map((m, i) => (
          <li key={i} className="module-row">
            <span className="module-row__label">M{i + 1}</span>
            <LengthField
              label="Largura"
              unit={unit}
              value={widths[i]!}
              onCommit={(w) => setWidth(i, w)}
              testId={`module-w-${i}`}
            />
            <label className="field">
              <span>Frente</span>
              <select
                value={m.front}
                onChange={(e) => setModule(i, { front: e.target.value as FrontKind })}
                data-testid={`module-front-${i}`}
              >
                {FRONT_KINDS.map((f) => (
                  <option key={f} value={f}>
                    {FRONT_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{m.front === 'drawers' ? 'Gavetas' : 'Prateleiras'}</span>
              <input
                type="number"
                min={m.front === 'drawers' ? 1 : 0}
                max={m.front === 'drawers' ? 8 : 12}
                value={m.front === 'drawers' ? m.drawers : m.shelves}
                onChange={(e) => {
                  const v = Math.max(0, Math.round(Number(e.target.value) || 0))
                  setModule(
                    i,
                    m.front === 'drawers'
                      ? { drawers: Math.max(1, Math.min(8, v)) }
                      : { shelves: Math.min(12, v) },
                  )
                }}
                data-testid={`module-qty-${i}`}
              />
            </label>
            <span className="small muted module-row__clear">
              vão {formatCm(solved.modules[i]!.clearWidth)}
            </span>
            {design.modules.length > 1 && (
              <button
                type="button"
                className="ghost icon"
                onClick={() => removeModule(i)}
                aria-label={`Remover M${i + 1}`}
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            )}
          </li>
        ))}
      </ol>
      <div className="button-row">
        <button type="button" onClick={addModule} data-testid="module-add">
          <Plus size={14} strokeWidth={1.5} />
          Módulo
        </button>
        <button type="button" onClick={equalWidths} data-testid="modules-equal">
          Módulos iguais
        </button>
        <button type="button" onClick={roundToCm}>
          Arredondar p/ cm
        </button>
      </div>

      {presets.length > 0 && (
        <label className="field">
          <span>Modelo pronto (banco)</span>
          <select
            value=""
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value)
              if (p) s.applyPreset(item.id, p)
            }}
            data-testid="joinery-preset"
          >
            <option value="">Aplicar um modelo…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Puxador</span>
        {handles.length > 0 ? (
          <select
            value={design.handleItem?.id ?? `kind:${design.handle}`}
            onChange={(e) => {
              const h = handles.find((x) => x.id === e.target.value)
              if (h) set({ ...design, handle: h.kind, handleItem: h })
            }}
            data-testid="joinery-handle"
          >
            {!design.handleItem && (
              <option value={`kind:${design.handle}`}>{HANDLE_LABEL[design.handle]}</option>
            )}
            {HANDLE_KINDS.map((k) => {
              const list = handles.filter((h) => h.kind === k)
              return list.length ? (
                <optgroup key={k} label={HANDLE_LABEL[k]}>
                  {list.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
              ) : null
            })}
          </select>
        ) : (
          <select
            value={design.handle}
            onChange={(e) =>
              set({ ...design, handle: e.target.value as HandleKind, handleItem: undefined })
            }
            data-testid="joinery-handle"
          >
            {HANDLE_KINDS.map((h) => (
              <option key={h} value={h}>
                {HANDLE_LABEL[h]}
              </option>
            ))}
          </select>
        )}
      </label>

      <details className="cutlist">
        <summary>
          Lista de peças ({solved.panels.reduce((a, p) => a + p.qty, 0)}) · {solved.hinges}{' '}
          dobradiças
        </summary>
        <table className="items-table" data-testid="cut-list">
          <thead>
            <tr>
              <th>Peça</th>
              <th className="num">Qtd</th>
              <th className="num">Medida (cm)</th>
            </tr>
          </thead>
          <tbody>
            {solved.panels.map((p, k) => (
              <tr key={k}>
                <td>
                  {p.name}
                  {p.splitsMm.length > 0 && <span className="pill pill--pending">emenda</span>}
                </td>
                <td className="num">{p.qty}</td>
                <td className="num">
                  {formatCm(p.lengthMm)} × {formatCm(p.widthMm)} × {formatCm(p.thicknessMm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

import { floorsOf } from '@/core/library/bundle'
import { useLibrary } from '@/features/library/library-store'
import { floorQuantities } from '@/core/finishes/quantities'
import type { AreaDrawing, Environment, Floor } from '@/core/project/schema'
import { formatBRL, formatDecimal } from '@/core/units'
import { LengthField, MoneyField, TextField } from './fields'
import { wallsOf } from './geometry'
import { useEditor } from './store'
import { useUnits } from './units-pref'

/** Piso da área: revestimento, paginação, perda, preço e rodapé. */
export function FloorFields({ area, env }: { area: AreaDrawing; env: Environment }) {
  const s = useEditor.getState()
  const u = useUnits()
  const finishes = floorsOf(useLibrary((l) => l.lib))
  const bankFinish = (id: string) => finishes.find((x) => x.id === id)
  const f = area.floor
  const set = (floor: Floor | undefined) => s.updateDrawing(area.id, { floor })
  const up = (patch: Partial<Floor>) => f && set({ ...f, ...patch })
  const q = f ? floorQuantities(area.points, f, wallsOf(env), env.openings) : null
  const monolithic = !!f && (f.pieceAMm === 0 || f.pieceBMm === 0)

  return (
    <section data-testid="floor-fields">
      <h2>Piso</h2>
      <label className="field">
        <span>Revestimento</span>
        <select
          value={f?.finishId ?? ''}
          data-testid="floor-finish"
          onChange={(e) => {
            const def = bankFinish(e.target.value)
            if (!def) return set(undefined)
            set({
              finishId: def.id,
              name: def.name,
              material: def.material,
              pieceAMm: def.pieceAMm,
              pieceBMm: def.pieceBMm,
              jointMm: def.jointMm,
              pattern: def.pattern,
              angleDeg: f?.angleDeg ?? 0,
              origin: f?.origin ?? 'center',
              wastePct: def.wastePct,
              color: def.color,
              priceCentsPerM2: useLibrary.getState().lib.floors.find((x) => x.id === def.id)
                ?.pricePerM2Cents,
              skirting: f?.skirting,
            })
          }}
        >
          <option value="">Sem piso</option>
          {finishes.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      {f && q && (
        <>
          <TextField
            label="Descrição (sai na legenda)"
            value={f.name}
            onCommit={(name) => up({ name: name || f.name })}
            testId="floor-name"
          />
          {!monolithic && (
            <>
              <div className="field-row">
                <LengthField
                  label="Peça: comprimento"
                  value={f.pieceAMm}
                  unit={u.item}
                  onCommit={(pieceAMm) => up({ pieceAMm })}
                  testId="floor-a"
                />
                <LengthField
                  label="Peça: largura"
                  value={f.pieceBMm}
                  unit={u.item}
                  onCommit={(pieceBMm) => up({ pieceBMm })}
                  testId="floor-b"
                />
              </div>
              <div className="field-row">
                <LengthField
                  label="Junta"
                  value={f.jointMm}
                  unit="mm"
                  allowZero
                  onCommit={(jointMm) => up({ jointMm })}
                />
                <label className="field">
                  <span>Paginação</span>
                  <select
                    value={f.pattern}
                    onChange={(e) => up({ pattern: e.target.value as Floor['pattern'] })}
                    data-testid="floor-pattern"
                  >
                    <option value="grid">Grade (alinhada)</option>
                    <option value="half">Amarração 1/2</option>
                    <option value="third">Amarração 1/3</option>
                  </select>
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Direção</span>
                  <select
                    value={f.angleDeg}
                    onChange={(e) => up({ angleDeg: Number(e.target.value) })}
                    data-testid="floor-angle"
                  >
                    <option value={0}>Horizontal</option>
                    <option value={90}>Vertical</option>
                    <option value={45}>Diagonal 45°</option>
                  </select>
                </label>
                <label className="field">
                  <span>Início</span>
                  <select
                    value={f.origin}
                    onChange={(e) => up({ origin: e.target.value as Floor['origin'] })}
                    data-testid="floor-origin"
                  >
                    <option value="center">Centralizado</option>
                    <option value="corner">Pelo canto</option>
                  </select>
                </label>
              </div>
            </>
          )}
          <div className="field-row">
            <TextField
              label="Perda (%)"
              value={formatDecimal(f.wastePct, 0)}
              onCommit={(v) => {
                const n = Number(v.replace(',', '.'))
                if (Number.isFinite(n) && n >= 0 && n <= 100) up({ wastePct: n })
              }}
              testId="floor-waste"
            />
            <label className="field">
              <span>Cor (humanizado)</span>
              <input type="color" value={f.color} onChange={(e) => up({ color: e.target.value })} />
            </label>
          </div>
          <MoneyField
            label="Preço por m²"
            cents={f.priceCentsPerM2}
            onCommit={(priceCentsPerM2) => up({ priceCentsPerM2 })}
            testId="floor-price"
          />
          <label className="check">
            <input
              type="checkbox"
              checked={!!f.skirting}
              onChange={(e) => up({ skirting: e.target.checked ? { heightMm: 70 } : undefined })}
              data-testid="floor-skirting"
            />
            Rodapé
          </label>
          {f.skirting && (
            <div className="field-row">
              <LengthField
                label="Altura do rodapé"
                value={f.skirting.heightMm}
                unit="cm"
                onCommit={(heightMm) => up({ skirting: { ...f.skirting!, heightMm } })}
              />
              <MoneyField
                label="Preço por metro"
                cents={f.skirting.priceCentsPerM}
                onCommit={(priceCentsPerM) => up({ skirting: { ...f.skirting!, priceCentsPerM } })}
                testId="skirting-price"
              />
            </div>
          )}
          <dl className="totals" data-testid="floor-totals">
            <dt>Área</dt>
            <dd>{formatDecimal(q.areaM2, 2)} m²</dd>
            <dt>Comprar (+{formatDecimal(f.wastePct, 0)}%)</dt>
            <dd data-testid="floor-buy">{formatDecimal(q.buyM2, 2)} m²</dd>
            {f.skirting && (
              <>
                <dt>Rodapé (sem portas)</dt>
                <dd data-testid="skirting-m">{formatDecimal(q.skirtingM, 2)} m</dd>
              </>
            )}
            <dt>Total do piso</dt>
            <dd data-testid="floor-total">
              {f.priceCentsPerM2 === undefined ? '—' : formatBRL(q.floorTotalCents)}
            </dd>
            {f.skirting && (
              <>
                <dt>Total do rodapé</dt>
                <dd>
                  {f.skirting.priceCentsPerM === undefined ? '—' : formatBRL(q.skirtingTotalCents)}
                </dd>
              </>
            )}
          </dl>
        </>
      )}
      {!f && (
        <p className="muted small">
          Escolha um revestimento para paginar o piso desta área e somar ao orçamento.
        </p>
      )}
    </section>
  )
}

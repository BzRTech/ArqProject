import { useEffect, useRef } from 'react'
import {
  formatBRL,
  formatLength,
  formatQty,
  parseBRL,
  parseLength,
  UNIT_LABEL,
  type LengthUnit,
} from '@/core/units'

/**
 * Mantém o input não controlado em dia com o valor do documento (desfazer, outro campo)
 * sem remontá-lo — remontar roubaria o foco de volta.
 */
function useSyncedInput(text: string) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el) el.value = text
  }, [text])
  return ref
}

function keys(e: React.KeyboardEvent<HTMLInputElement>, reset: string) {
  if (e.key === 'Enter') e.currentTarget.blur()
  if (e.key === 'Escape') {
    e.currentTarget.value = reset
    e.currentTarget.blur()
  }
}

/**
 * Campo de comprimento que grava mm inteiros ao sair ou com Enter. Mostra e lê na unidade
 * dada; um sufixo digitado ("350cm", "4,4 m") tem prioridade sobre ela.
 */
export function LengthField({
  label,
  value,
  unit,
  onCommit,
  allowZero,
  testId,
}: {
  label: string
  value: number
  unit: LengthUnit
  onCommit: (mm: number) => void
  allowZero?: boolean
  testId?: string
}) {
  const shown = formatLength(value, unit)
  const ref = useSyncedInput(shown)
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field__input">
        <input
          ref={ref}
          defaultValue={shown}
          inputMode="decimal"
          data-testid={testId}
          onBlur={(e) => {
            const mm = parseLength(e.target.value, unit)
            if (mm !== null && (allowZero || mm > 0) && mm !== value) onCommit(mm)
            else e.target.value = shown
          }}
          onKeyDown={(e) => keys(e, shown)}
        />
        <small>{UNIT_LABEL[unit]}</small>
      </span>
    </label>
  )
}

export function TextField({
  label,
  value,
  onCommit,
  autoFocus,
  testId,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
  autoFocus?: boolean
  testId?: string
}) {
  const ref = useSyncedInput(value)
  return (
    <label className="field">
      <span>{label}</span>
      <input
        ref={ref}
        defaultValue={value}
        autoFocus={autoFocus}
        data-testid={testId}
        onFocus={(e) => autoFocus && e.target.select()}
        onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
        onKeyDown={(e) => keys(e, value)}
      />
    </label>
  )
}

/** Campo de dinheiro (R$) que grava CENTAVOS inteiros; vazio = sem preço. */
export function MoneyField({
  label,
  cents,
  onCommit,
  testId,
}: {
  label: string
  cents: number | undefined
  onCommit: (cents: number | undefined) => void
  testId?: string
}) {
  const shown = cents === undefined ? '' : formatBRL(cents).replace('R$ ', '')
  const ref = useSyncedInput(shown)
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field__input">
        <small>R$</small>
        <input
          ref={ref}
          defaultValue={shown}
          inputMode="decimal"
          placeholder="0,00"
          data-testid={testId}
          onBlur={(e) => {
            const raw = e.target.value.trim()
            if (raw === '') {
              if (cents !== undefined) onCommit(undefined)
              return
            }
            const v = parseBRL(raw)
            if (v !== null && v !== cents) onCommit(v)
            else e.target.value = shown
          }}
          onKeyDown={(e) => keys(e, shown)}
        />
      </span>
    </label>
  )
}

/** Quantidade (aceita fração: 2,5 m). */
export function QtyField({
  label,
  value,
  onCommit,
  testId,
}: {
  label: string
  value: number
  onCommit: (v: number) => void
  testId?: string
}) {
  const shown = formatQty(value)
  const ref = useSyncedInput(shown)
  return (
    <label className="field">
      <span>{label}</span>
      <input
        ref={ref}
        defaultValue={shown}
        inputMode="decimal"
        data-testid={testId}
        onBlur={(e) => {
          const v = Number(e.target.value.trim().replace(/\./g, '').replace(',', '.'))
          if (Number.isFinite(v) && v > 0 && v !== value) onCommit(v)
          else e.target.value = shown
        }}
        onKeyDown={(e) => keys(e, shown)}
      />
    </label>
  )
}

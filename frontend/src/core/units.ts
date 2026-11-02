/**
 * Unidades e formatação.
 * Regra do projeto: o modelo guarda MILÍMETROS INTEIROS. Centímetros só na exibição (pt-BR).
 */

/** Arredonda para mm inteiro (metade para longe do zero), garantindo que não sai `-0`. */
export function roundMm(value: number): number {
  const r = Math.sign(value) * Math.round(Math.abs(value))
  return r === 0 ? 0 : r
}

export function cmToMm(cm: number): number {
  return roundMm(cm * 10)
}

/** Formata número com `decimals` casas e vírgula decimal, sem separador de milhar. */
export function formatDecimal(value: number, decimals: number): string {
  const factor = 10 ** decimals
  const rounded = Math.sign(value) * Math.round(Math.abs(value) * factor)
  const neg = rounded < 0
  const abs = Math.abs(rounded)
  const int = Math.floor(abs / factor)
  const frac = abs - int * factor
  const body = decimals > 0 ? `${int},${String(frac).padStart(decimals, '0')}` : String(int)
  return neg && abs !== 0 ? `-${body}` : body
}

export interface FormatCmOptions {
  /** `auto` (padrão): 1 casa só quando não é inteiro ("45,2", "318"); `fixed`: sempre 1 casa. */
  decimals?: 'auto' | 'fixed'
  /** Acrescenta " cm". */
  unit?: boolean
}

/** mm → texto em cm pt-BR. 452 → "45,2"; 3180 → "318". */
export function formatCm(mm: number, options: FormatCmOptions = {}): string {
  const tenths = roundMm(mm) // 1 mm = 0,1 cm: mm inteiro já é cm com 1 casa exata
  const text =
    options.decimals === 'fixed' || tenths % 10 !== 0
      ? formatDecimal(tenths / 10, 1)
      : formatDecimal(tenths / 10, 0)
  return options.unit ? `${text} cm` : text
}

/** mm → metros com 2 casas: 4000 → "4,00 m". */
export function formatM(mm: number): string {
  return `${formatDecimal(mm / 1000, 2)} m`
}

/** mm² → m² com 2 casas: 12_350_000 → "12,35 m²". */
export function formatAreaM2(mm2: number): string {
  return `${formatDecimal(mm2 / 1_000_000, 2)} m²`
}

/**
 * Lê um comprimento digitado em cm no padrão brasileiro e devolve mm inteiros.
 * Aceita "45,2", "45.2", " 318 ", "1.234,5" (milhar com ponto + vírgula decimal).
 * Retorna `null` se não for um número válido.
 */
export function parseCm(input: string): number | null {
  let s = input.trim().replace(/\s*cm$/i, '')
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return cmToMm(Number(s))
}

/** Converte medida do modelo (mm) para mm de papel numa escala 1:`scale`. */
export function modelToPaper(mm: number, scale: number): number {
  return mm / scale
}

export function paperToModel(paperMm: number, scale: number): number {
  return paperMm * scale
}

// --- Dinheiro -------------------------------------------------------------------
// Mesma regra dos milímetros: guardamos CENTAVOS inteiros, nunca float de reais.

/** Centavos → "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  const c = Math.round(cents)
  const neg = c < 0
  const abs = Math.abs(c)
  const reais = Math.floor(abs / 100)
  const frac = String(abs % 100).padStart(2, '0')
  const grouped = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}R$ ${grouped},${frac}`
}

/**
 * Lê valor digitado em reais (pt-BR) e devolve centavos inteiros.
 * Aceita "1.234,56", "1234,5", "1234", "R$ 99,90", "1.500" (= mil e quinhentos).
 */
export function parseBRL(input: string): number | null {
  let s = input
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '')
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}

/** Quantidade pt-BR: inteiro sem casas, fração com até 2 ("2", "2,5"). */
export function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : formatDecimal(q, Math.round(q * 10) === q * 10 ? 1 : 2)
}

// --- Unidades de exibição/entrada de comprimento ------------------------------------
// O modelo continua em mm inteiros; isto só muda como o usuário VÊ e DIGITA.

export type LengthUnit = 'm' | 'cm' | 'mm'

/** mm → texto na unidade: m com 2 casas ("4,40"), cm como formatCm ("45,2"), mm inteiro. */
export function formatLength(mm: number, unit: LengthUnit): string {
  if (unit === 'm') return formatDecimal(roundMm(mm) / 1000, 2)
  if (unit === 'cm') return formatCm(mm)
  return String(roundMm(mm))
}

const UNIT_FACTOR: Record<LengthUnit, number> = { m: 1000, cm: 10, mm: 1 }

/**
 * Lê um comprimento digitado e devolve mm inteiros. Sem sufixo, usa `unit`; com sufixo
 * ("3,5 m", "350cm", "3500 mm"), o sufixo manda. Aceita vírgula ou ponto decimal e
 * milhar com ponto quando há vírgula ("1.234,5"). Retorna `null` se inválido.
 */
export function parseLength(input: string, unit: LengthUnit): number | null {
  const m = /^\s*(-?[\d.,]+)\s*(mm|cm|m)?\s*$/i.exec(input)
  if (!m) return null
  let num = m[1]!
  const u = (m[2]?.toLowerCase() as LengthUnit | undefined) ?? unit
  if (num.includes(',')) num = num.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(num)) return null
  return roundMm(Number(num) * UNIT_FACTOR[u])
}

export const UNIT_LABEL: Record<LengthUnit, string> = { m: 'm', cm: 'cm', mm: 'mm' }

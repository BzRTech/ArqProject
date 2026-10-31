import { describe, expect, it } from 'vitest'
import {
  cmToMm,
  formatBRL,
  formatQty,
  parseBRL,
  formatAreaM2,
  formatCm,
  formatDecimal,
  formatM,
  modelToPaper,
  paperToModel,
  parseCm,
  roundMm,
} from './units'

describe('roundMm', () => {
  it('arredonda metade para longe do zero', () => {
    expect(roundMm(0.5)).toBe(1)
    expect(roundMm(-0.5)).toBe(-1)
    expect(roundMm(452.49)).toBe(452)
  })
  it('não devolve -0', () => {
    expect(Object.is(roundMm(-0.2), 0)).toBe(true)
  })
})

describe('formatDecimal', () => {
  it('usa vírgula e não tem separador de milhar', () => {
    expect(formatDecimal(1234.5, 1)).toBe('1234,5')
    expect(formatDecimal(0.05, 1)).toBe('0,1')
    expect(formatDecimal(-2.25, 1)).toBe('-2,3')
    expect(formatDecimal(-0.01, 1)).toBe('0,0')
    expect(formatDecimal(7, 2)).toBe('7,00')
  })
})

describe('formatCm (pt-BR)', () => {
  it.each([
    [452, '45,2'],
    [3180, '318'],
    [909, '90,9'],
    [18, '1,8'],
    [0, '0'],
    [100, '10'],
    [-25, '-2,5'],
  ])('%i mm → "%s"', (mm, text) => {
    expect(formatCm(mm)).toBe(text)
  })

  it('casas fixas e unidade', () => {
    expect(formatCm(3180, { decimals: 'fixed' })).toBe('318,0')
    expect(formatCm(452, { unit: true })).toBe('45,2 cm')
  })

  it('arredonda frações de mm antes de formatar', () => {
    expect(formatCm(452.6)).toBe('45,3')
  })
})

describe('formatM / formatAreaM2', () => {
  it('metros com 2 casas', () => {
    expect(formatM(4000)).toBe('4,00 m')
    expect(formatM(2705)).toBe('2,71 m')
  })
  it('área em m²', () => {
    expect(formatAreaM2(3500 * 3530)).toBe('12,36 m²')
    expect(formatAreaM2(0)).toBe('0,00 m²')
  })
})

describe('parseCm', () => {
  it.each([
    ['45,2', 452],
    ['45.2', 452],
    [' 318 ', 3180],
    ['318 cm', 3180],
    ['1.234,5', 12345],
    ['0,05', 1],
    ['-2,5', -25],
  ])('"%s" → %i mm', (input, mm) => {
    expect(parseCm(input)).toBe(mm)
  })
  it.each(['', 'abc', '4,5,6', '12a'])('"%s" é inválido', (input) => {
    expect(parseCm(input)).toBeNull()
  })
  it('cmToMm sempre devolve inteiro', () => {
    expect(cmToMm(45.23)).toBe(452)
  })
})

describe('escala', () => {
  it('1:50 — 4 m viram 80 mm de papel', () => {
    expect(modelToPaper(4000, 50)).toBe(80)
    expect(paperToModel(80, 50)).toBe(4000)
  })
})

describe('dinheiro (centavos inteiros)', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
    [-990, '-R$ 9,90'],
  ])('%i → "%s"', (c, t) => expect(formatBRL(c)).toBe(t))

  it.each([
    ['1.234,56', 123456],
    ['1234,5', 123450],
    ['1234', 123400],
    ['R$ 99,90', 9990],
    ['1.500', 150000],
    [' 0,1 ', 10],
  ])('"%s" → %i centavos', (t, c) => expect(parseBRL(t)).toBe(c))

  it.each(['', 'abc', '1,234,5', '-5', '1,999'])('"%s" é inválido', (t) =>
    expect(parseBRL(t)).toBeNull(),
  )

  it('quantidade', () => {
    expect(formatQty(2)).toBe('2')
    expect(formatQty(2.5)).toBe('2,5')
    expect(formatQty(1.25)).toBe('1,25')
  })
})

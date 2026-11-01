import { describe, expect, it } from 'vitest'
import { buildSheetSvg, DEFAULT_SPEC, formatCm, toPaper } from './sheet'

describe('folha do spike', () => {
  it('converte modelo para papel em 1:50', () => {
    expect(toPaper(4000, 50)).toBe(80)
    expect(toPaper(1000, 50)).toBe(20)
  })

  it('parede de 4 m mede 80 mm no papel', () => {
    expect(buildSheetSvg(DEFAULT_SPEC).wallPaperLengthMm).toBe(80)
  })

  it('formata cota em cm pt-BR', () => {
    expect(formatCm(4000)).toBe('400')
    expect(formatCm(452)).toBe('45,2')
  })

  it('SVG em mm de papel A3', () => {
    const { svg } = buildSheetSvg()
    expect(svg).toContain('width="420mm"')
    expect(svg).toContain('viewBox="0 0 420 297"')
  })
})

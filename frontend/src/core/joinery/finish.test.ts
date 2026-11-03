import { describe, expect, it } from 'vitest'
import {
  applyFinish,
  isJoineryBlock,
  joineryNotes,
  joinerySummary,
  missingParts,
  planFinish,
  shade,
} from './finish'
import { getMaterial } from './materials'
import { environmentLegend } from '../project/env-sheet'
import { itemEntities } from '../project/items'

const freijo = getMaterial('freijo')!
const branco = getMaterial('branco')!

describe('acabamento de marcenaria', () => {
  it('só guarda-roupa e rack (disciplina marcenaria) são marcenaria', () => {
    expect(isJoineryBlock('guarda-roupa')).toBe(true)
    expect(isJoineryBlock('rack')).toBe(true)
    expect(isJoineryBlock('cama-casal')).toBe(false)
  })

  it('aplica a tudo e depois troca só uma parte; guarda cópia do MDF', () => {
    let j = applyFinish(undefined, 'all', freijo)
    expect(missingParts(j)).toEqual([])
    j = applyFinish(j, ['corpo'], branco)
    expect(j.finishes.corpo).toEqual({
      materialId: 'branco',
      name: 'Branco',
      kind: 'liso',
      hex: '#f7f6f2',
    })
    expect(j.finishes.frentes?.name).toBe('Freijó')
    expect(j.grain).toBe('vertical')
  })

  it('resumo para legenda: veio só nas frentes madeiradas', () => {
    const j = applyFinish(applyFinish(undefined, 'all', freijo), ['corpo'], branco)
    expect(joinerySummary(j)).toBe(
      'Frentes: Freijó (veio vertical) · Corpo: Branco · Tamponamento: Freijó',
    )
    expect(joinerySummary(undefined)).toBe('')
  })

  it('cor na planta: frentes, senão tamponamento, senão corpo', () => {
    expect(planFinish(applyFinish(undefined, ['corpo'], branco))?.hex).toBe('#f7f6f2')
    expect(planFinish(applyFinish(undefined, ['tamponamento'], freijo))?.name).toBe('Freijó')
  })

  it('observações: uma por linha, sem vazias', () => {
    expect(
      joineryNotes({
        finishes: {},
        grain: 'vertical',
        notes: 'Puxador cava\n\n  Fita de borda 1 mm ',
      }),
    ).toEqual(['Puxador cava', 'Fita de borda 1 mm'])
  })

  it('veio do madeirado: tom mais escuro', () => {
    expect(shade('#808080', 0.5)).toBe('#404040')
  })
})

describe('acabamento na planta e na legenda', () => {
  const rack = {
    id: 'r',
    blockId: 'rack',
    blockVersion: 1,
    name: 'Rack',
    position: { x: 1000, y: 1000 },
    rotationDeg: 0,
    mirrored: false,
    sizeMm: { w: 1800, d: 450 },
    qty: 1,
    unit: 'un' as const,
    showMarker: true,
    inLegend: true,
    existing: false,
    approved: false,
    joinery: applyFinish(undefined, 'all', freijo),
  }

  it('humanizado: preenchimentos com a cor do MDF e veio; sem humanizado, não muda', () => {
    const plain = JSON.stringify(itemEntities(rack))
    expect(plain).not.toContain(freijo.hex)
    const h = itemEntities(rack, { humanized: true })
    expect(JSON.stringify(h)).toContain(`"color":"${freijo.hex}"`)
    expect(h.some((e) => e.kind === 'hatch')).toBe(true) // veio do madeirado
    const liso = itemEntities(
      { ...rack, joinery: applyFinish(undefined, 'all', branco) },
      { humanized: true },
    )
    expect(liso.some((e) => e.kind === 'hatch')).toBe(false)
  })

  it('legenda da prancha: M01 com o acabamento na segunda linha', () => {
    const env = {
      id: 'e',
      name: 'Sala',
      ceilingHeightMm: 2700,
      basePlan: null,
      drawings: [],
      openings: [],
      items: [rack],
    }
    const [line] = environmentLegend(env)
    expect(line).toMatchObject({ label: 'M01', text: 'Rack' })
    expect(line!.detail).toBe(
      'Frentes: Freijó (veio vertical) · Corpo: Freijó · Tamponamento: Freijó',
    )
  })
})

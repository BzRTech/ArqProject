import { describe, expect, it } from 'vitest'
import type { JoineryDesign, JoineryModule } from '../project/schema'
import { DEFAULT_RULE_PROFILE as R, hingesFor } from './rules'
import { equalizeDoors, normalizeModules, solveJoinery } from './solve'
import { validateJoinery } from './validate'

const mod = (widthMm: number, front: JoineryModule['front'], shelves = 0): JoineryModule => ({
  widthMm,
  front,
  shelves,
  drawers: 3,
})

// Rack do vídeo de referência, com as regras do PLANO 4.6 (sem os cantos curvos, que são pós-MVP)
const rack: JoineryDesign = {
  heightMm: 400,
  base: { kind: 'suspended', heightMm: 100 },
  modules: [mod(909, 'door2', 1), mod(909, 'door2', 1), mod(909, 'door2', 1), mod(453, 'door1', 1)],
  handle: 'touch',
}
const size = { w: 3180, d: 450 }

describe('regras', () => {
  it('dobradiças pela altura da porta', () => {
    expect(hingesFor(397, R)).toBe(2)
    expect(hingesFor(900, R)).toBe(2)
    expect(hingesFor(1200, R)).toBe(3)
    expect(hingesFor(2300, R)).toBe(4)
  })
})

describe('módulos', () => {
  it('largura eixo a eixo somando a largura do móvel (ajuste proporcional, sobra no último)', () => {
    expect(normalizeModules([909, 909, 909, 453], 3180)).toEqual([909, 909, 909, 453])
    expect(normalizeModules([900, 900], 2000)).toEqual([1000, 1000])
    expect(normalizeModules([1000, 1000, 1000], 3001)).toEqual([1000, 1000, 1001])
  })
})

describe('rack 3180 × 450 × 400, suspenso 10 cm, módulos 909/909/909/453', () => {
  const s = solveJoinery(size, rack, R)

  it('vãos livres: ponta tira a lateral inteira, divisória tira meia', () => {
    expect(s.modules.map((m) => m.clearWidth)).toEqual([882, 891, 891, 426])
    expect(s.modules.map((m) => [m.x0, m.x1])).toEqual([
      [0, 909],
      [909, 1818],
      [1818, 2727],
      [2727, 3180],
    ])
    expect(s.clearHeight).toBe(364) // 400 − 2 × 18
  })

  it('portas sobrepostas com folga de 3 mm: 452/451 nos módulos de 2 portas, 450 no de 1', () => {
    expect(s.doors.map((d) => d.w)).toEqual([452, 451, 452, 451, 452, 451, 450])
    expect(new Set(s.doors.map((d) => d.h))).toEqual(new Set([397]))
    expect(s.doors[0]).toMatchObject({ x: 1.5, z: 1.5, hinge: 'left' })
    expect(s.doors[1]).toMatchObject({ x: 456.5, hinge: 'right' }) // 1,5 + 452 + 3
    expect(s.hinges).toBe(14)
    expect(s.touchLatches).toBe(7)
  })

  it('peças do corpo, com emenda sobre a divisória quando passa da chapa', () => {
    const p = (name: string) => s.panels.find((x) => x.name === name)!
    expect(p('Lateral esquerda')).toMatchObject({
      lengthMm: 400,
      widthMm: 450,
      thicknessMm: 18,
      qty: 1,
    })
    expect(p('Tampo')).toMatchObject({ lengthMm: 3144, widthMm: 450, splitsMm: [2709] })
    expect(p('Base')).toMatchObject({ lengthMm: 3144, splitsMm: [2709] })
    expect(p('Fundo')).toMatchObject({
      lengthMm: 3144,
      widthMm: 364,
      thicknessMm: 6,
      splitsMm: [2709],
    })
    expect(p('Divisória')).toMatchObject({ lengthMm: 364, widthMm: 434, qty: 3, splitsMm: [] })
    // prateleira: vão × (450 − 10 − 6 − 20)
    expect(p('Prateleira M1')).toMatchObject({ lengthMm: 882, widthMm: 414 })
    expect(p('Prateleira M4')).toMatchObject({ lengthMm: 426, widthMm: 414 })
  })

  it('prateleira no meio do vão livre', () => {
    // vão 364, 1 prateleira de 18: (364 − 18) / 2 = 173 de cada lado
    expect(s.modules[0]!.shelvesZ).toEqual([18 + 173])
  })

  it('sem avisos bloqueantes; portas dentro da tolerância (452 × 450 = 2 mm)', () => {
    const w = validateJoinery(s, R)
    expect(w.filter((x) => x.level === 'error')).toEqual([])
    expect(w.some((x) => x.code === 'door-widths')).toBe(false)
    expect(w.some((x) => x.code === 'splice')).toBe(true)
  })
})

describe('avisos e ações', () => {
  it('módulo com vão menor que 10 cm: não dá para montar', () => {
    const d = { ...rack, modules: [mod(1534, 'door2'), mod(1534, 'door2'), mod(112, 'door1')] }
    const s = solveJoinery(size, d, R)
    expect(s.modules[2]!.clearWidth).toBe(85) // 112 − 9 − 18
    const err = validateJoinery(s, R).find((x) => x.code === 'min-clear')!
    expect(err.level).toBe('error')
    expect(err.text).toBe('M3 com vão de 8,5 cm: não dá para montar (mínimo 10 cm).')
  })

  it('portas de larguras diferentes: aviso com a lista e "igualar portas"', () => {
    const d = {
      ...rack,
      modules: [mod(909, 'door2'), mod(909, 'door2'), mod(909, 'door2'), mod(453, 'door2')],
    }
    const w = validateJoinery(solveJoinery(size, d, R), R).find((x) => x.code === 'door-widths')!
    expect(w.text).toBe(
      'Portas com larguras diferentes: 3 × 45,2 · 3 × 45,1 · 1 × 22,4 · 1 × 22,3 cm.',
    )
    expect(w.action).toBe('equalize-doors')
    const eq = equalizeDoors(size.w, d, R)
    expect(eq.modules.map((m) => m.widthMm)).toEqual([795, 795, 795, 795])
    const doors = solveJoinery(size, eq, R).doors.map((x) => x.w)
    expect(Math.max(...doors) - Math.min(...doors)).toBeLessThanOrEqual(1)
  })

  it('igualar mantém os módulos abertos e de gavetas como estão', () => {
    const d = { ...rack, modules: [mod(600, 'open'), mod(1290, 'door2'), mod(1290, 'door1')] }
    const eq = equalizeDoors(size.w, d, R)
    expect(eq.modules[0]!.widthMm).toBe(600)
    // 2580 para 3 portas: 860 por porta (inclui a folga) → 1720 + 860
    expect(eq.modules.slice(1).map((m) => m.widthMm)).toEqual([1720, 860])
  })

  it('gavetas: frentes iguais na altura, com folga entre elas', () => {
    const d = { ...rack, heightMm: 600, modules: [mod(3180, 'drawers')] }
    const s = solveJoinery(size, { ...d, modules: [{ ...d.modules[0]!, drawers: 3 }] }, R)
    // (600 − 3 × 3) = 591 → 197 cada
    expect(s.drawers.map((x) => x.h)).toEqual([197, 197, 197])
    expect(s.drawers.map((x) => x.z)).toEqual([1.5, 201.5, 401.5])
    expect(s.drawers[0]!.w).toBe(3177)
  })
})

describe('especificações do rack (numeradas na prancha)', () => {
  it('saem calculadas, com acabamento, ferragens, emenda e observações', async () => {
    const { joinerySpecs } = await import('./specs')
    const { applyFinish } = await import('./finish')
    const { getMaterial } = await import('./materials')
    const j = {
      ...applyFinish(
        applyFinish(undefined, 'all', getMaterial('freijo')!),
        ['corpo'],
        getMaterial('branco')!,
      ),
      notes: 'Rasgo para fiação no fundo do M2',
    }
    expect(joinerySpecs(solveJoinery(size, rack, R), j, R)).toEqual([
      'Medidas: 318 × 45 × 40 cm (L × P × A), suspenso 10 cm do piso.',
      'Corpo em MDF 18 mm — Branco.',
      'Laterais e tampo em MDF 18 mm — Freijó.',
      'Frentes em MDF 18 mm sobrepostas, folga de 3 mm — Freijó, veio vertical.',
      'Fundo em MDF 6 mm, recuado 1 cm.',
      '4 módulo(s), eixo a eixo: M1 90,9 · M2 90,9 · M3 90,9 · M4 45,3 cm.',
      '7 porta(s) de abrir com 14 dobradiças (2 por porta).',
      'Abertura por fecho toque, sem puxador (7 un).',
      '4 prateleira(s) em MDF 18 mm, recuadas 2 cm da frente.',
      'Tampo, base e fundo emendados sobre a divisória a 272,7 cm da esquerda.',
      'Rasgo para fiação no fundo do M2',
      'Medidas em centímetros. Conferir no local antes de produzir.',
    ])
  })

  it('puxador escolhido no banco sai pelo nome, acabamento e código', async () => {
    const { joinerySpecs } = await import('./specs')
    const handleItem = {
      id: 'barra-256',
      version: 1,
      name: 'Barra 256 mm',
      kind: 'bar' as const,
      finish: 'Inox escovado',
      code: 'BX-256',
    }
    const design = { ...rack, handle: 'bar' as const, handleItem }
    const j = { finishes: {}, grain: 'vertical' as const, design }
    const specs = joinerySpecs(solveJoinery(size, design, R), j, R)
    expect(specs).toContain('Puxador: Barra 256 mm, Inox escovado (cód. BX-256).')
  })
})

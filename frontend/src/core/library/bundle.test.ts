import { describe, expect, it } from 'vitest'
import { BUILTIN_LIBRARY, officeRules, parseLibrary } from './bundle'
import { LIBRARY_SEED } from './seed'

describe('bundle dos bancos', () => {
  it('o embutido tem todo o seed', () => {
    expect(BUILTIN_LIBRARY.items).toHaveLength(LIBRARY_SEED.items.length)
    expect(officeRules(BUILTIN_LIBRARY)!.id).toBe('padrao')
  })

  it('deixa de fora entradas inválidas e diz por quê', () => {
    const { library, rejected } = parseLibrary({
      materials: [
        { id: 'ok', version: 1, name: 'Ok', kind: 'liso', hex: '#ffffff' },
        { id: 'ruim', version: 1, name: 'Ruim', kind: 'liso', hex: 'azul' },
      ],
    })
    expect(library.materials.map((m) => m.id)).toEqual(['ok'])
    expect(library.items).toEqual([])
    expect(rejected).toEqual([expect.stringMatching(/^materials\/ruim: /)])
  })

  it('regras do escritório: prefere o perfil "padrao"', () => {
    const base = LIBRARY_SEED.rules[0]!
    const lib = parseLibrary({
      rules: [
        { ...base, id: 'outro' },
        { ...base, version: 4 },
      ],
    }).library
    expect(officeRules(lib)).toMatchObject({ id: 'padrao', version: 4 })
  })
})

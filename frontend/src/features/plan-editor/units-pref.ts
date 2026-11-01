import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LengthUnit } from '@/core/units'

/**
 * Preferência de unidades do usuário (só exibição/entrada; o modelo segue em mm).
 * Paredes costumam ser pensadas em metros; móveis e esquadrias, em cm ou mm.
 */
export interface UnitsPref {
  wall: Extract<LengthUnit, 'm' | 'cm'>
  item: Extract<LengthUnit, 'cm' | 'mm'>
  setWall: (u: UnitsPref['wall']) => void
  setItem: (u: UnitsPref['item']) => void
  /** Modo humanizado (pisos com cor), na tela e no PDF. */
  humanized: boolean
  setHumanized: (v: boolean) => void
}

export const useUnits = create<UnitsPref>()(
  persist(
    (set) => ({
      wall: 'm',
      item: 'cm',
      setWall: (wall) => set({ wall }),
      setItem: (item) => set({ item }),
      humanized: true,
      setHumanized: (humanized) => set({ humanized }),
    }),
    { name: 'prancheta.unidades' },
  ),
)

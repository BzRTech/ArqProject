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
}

export const useUnits = create<UnitsPref>()(
  persist(
    (set) => ({
      wall: 'm',
      item: 'cm',
      setWall: (wall) => set({ wall }),
      setItem: (item) => set({ item }),
    }),
    { name: 'prancheta.unidades' },
  ),
)

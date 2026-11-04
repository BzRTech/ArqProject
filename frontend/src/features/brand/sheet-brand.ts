import { useEffect } from 'react'
import { create } from 'zustand'
import { brandLines, useBrand } from '@/api/brand'
import type { SheetBrand } from '@/core/sheets/plan-sheet'
import { getAsset, imageSize } from '@/features/plan-editor/persistence'

/**
 * Marca do escritório no carimbo das pranchas (tela e PDF). Só em projetos do servidor; o
 * rascunho local sai com o carimbo neutro. O logo vira data URL (o PDF embute a imagem).
 */
export const useSheetBrand = create<{ brand: SheetBrand | undefined }>()(() => ({
  brand: undefined,
}))

export function useLoadSheetBrand(enabled: boolean) {
  const brand = useBrand(enabled).data
  useEffect(() => {
    if (!enabled || !brand) {
      useSheetBrand.setState({ brand: undefined })
      return
    }
    let alive = true
    const base: SheetBrand = { name: brand.name, lines: brandLines(brand) }
    useSheetBrand.setState({ brand: base })
    if (brand.logo) {
      void getAsset(brand.logo).then(async (href) => {
        if (!href || !alive) return
        const { width, height } = await imageSize(href)
        if (alive)
          useSheetBrand.setState({ brand: { ...base, logo: { href, aspect: width / height } } })
      })
    }
    return () => {
      alive = false
    }
  }, [enabled, brand])
}

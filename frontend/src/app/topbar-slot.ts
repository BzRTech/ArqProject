import { createContext, useContext } from 'react'

/** Elemento à direita da barra superior onde a página atual pode pôr as suas ações (portal). */
export const TopbarSlotContext = createContext<HTMLElement | null>(null)

export const useTopbarSlot = () => useContext(TopbarSlotContext)

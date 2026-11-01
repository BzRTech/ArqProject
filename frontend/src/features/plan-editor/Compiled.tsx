import { memo, useMemo } from 'react'
import { compileView } from '@/core/drawing/compile'
import type { Entity } from '@/core/drawing/entities'
import { primitiveNodes } from '@/render/svg/primitives-to-svg'
import { SvgNodeView } from '@/render/svg/SvgNodeView'
import { DISPLAY_SCALE } from './geometry'

const VIEW = { scale: DISPLAY_SCALE, origin: { x: 0, y: 0 } }
/** Na tela, cai para fontes do sistema enquanto a Roboto carrega. No PDF é só Roboto. */
const SCREEN_FONT = 'Roboto, Arial, sans-serif'

/**
 * Desenha entidades do modelo com a mesma compilação da prancha (escala de exibição 1:50):
 * a tela mostra penas e textos como sairão no papel.
 */
export const Compiled = memo(function Compiled({
  entities,
  opacity,
  role,
}: {
  entities: Entity[]
  opacity?: number
  role?: string
}) {
  const node = useMemo(
    () => ({
      tag: 'g',
      attrs: { transform: `scale(${DISPLAY_SCALE})`, ...(role ? { 'data-role': role } : {}) },
      children: primitiveNodes(compileView(entities, VIEW), SCREEN_FONT),
    }),
    [entities, role],
  )
  return (
    <g opacity={opacity}>
      <SvgNodeView node={node} />
    </g>
  )
})

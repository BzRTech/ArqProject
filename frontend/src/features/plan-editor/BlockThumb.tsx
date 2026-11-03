import { memo, useMemo } from 'react'
import { buildSymbol } from '@/core/blocks/symbol'
import type { BlockDef } from '@/core/blocks/types'
import { thumbNode } from './thumb-node'
import { SvgNodeView } from '@/render/svg/SvgNodeView'

/** Miniatura gerada pelo mesmo núcleo que desenha a planta e o PDF. */
export const BlockThumb = memo(function BlockThumb({ block }: { block: BlockDef }) {
  const node = useMemo(() => thumbNode(buildSymbol(block.symbol, block.defaultSize)), [block])
  return (
    <span className="block__thumb">
      <SvgNodeView node={node} width={50} height={50} />
    </span>
  )
})

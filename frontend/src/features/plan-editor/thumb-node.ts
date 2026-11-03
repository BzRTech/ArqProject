import { entitiesBBox } from '@/core/drawing/bounds'
import { compileView } from '@/core/drawing/compile'
import type { Entity } from '@/core/drawing/entities'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'

/** Miniatura (SVG em "mm" de miniatura) de entidades quaisquer, enquadradas. */
export function thumbNode(es: Entity[]) {
  {
    const bb = entitiesBBox(es)
    const size = 44
    const scale = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY) / (size - 6)
    const prims = compileView(es, {
      scale,
      origin: {
        x: (size - (bb.maxX - bb.minX) / scale) / 2 - bb.minX / scale,
        y: (size - (bb.maxY - bb.minY) / scale) / 2 - bb.minY / scale,
      },
    })
    return primitivesToSvg(prims, { widthMm: size, heightMm: size })
  }
}

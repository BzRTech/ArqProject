import { memo, useMemo, useState } from 'react'
import { CATALOG } from '@/core/blocks/catalog'
import { buildSymbol } from '@/core/blocks/symbol'
import type { BlockDef } from '@/core/blocks/types'
import { entitiesBBox } from '@/core/drawing/bounds'
import { compileView } from '@/core/drawing/compile'
import { formatCm } from '@/core/units'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { SvgNodeView } from '@/render/svg/SvgNodeView'
import { useEditor } from './store'

const DISCIPLINE_LABEL: Record<BlockDef['discipline'], string> = {
  layout: 'Layout',
  marcenaria: 'Marcenaria',
  eletrica: 'Elétrica',
  revestimentos: 'Revestimentos',
  hidraulica: 'Hidráulica',
}

/** Miniatura gerada pelo mesmo núcleo que desenha a planta e o PDF. */
const BlockThumb = memo(function BlockThumb({ block }: { block: BlockDef }) {
  const node = useMemo(() => {
    const es = buildSymbol(block.symbol, block.defaultSize)
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
  }, [block])
  return <SvgNodeView node={node} width={56} height={56} />
})

export function CatalogPanel() {
  const [query, setQuery] = useState('')
  const placing = useEditor((s) => (s.tool === 'place' ? s.placeBlockId : null))
  const startPlacing = useEditor((s) => s.startPlacing)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = CATALOG.filter(
      (b) => !q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q),
    )
    const map = new Map<string, BlockDef[]>()
    for (const b of list) map.set(b.category, [...(map.get(b.category) ?? []), b])
    return [...map.entries()]
  }, [query])

  return (
    <aside className="panel panel--catalog" data-testid="catalog">
      <h2>Blocos</h2>
      <input
        type="search"
        placeholder="Buscar bloco…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar bloco"
      />
      {groups.map(([category, blocks]) => (
        <section key={category}>
          <h3>{category}</h3>
          <ul className="block-list">
            {blocks.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={`block ${placing === b.id ? 'block--active' : ''}`}
                  data-testid={`block-${b.id}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-prancheta-block', b.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => startPlacing(b.id)}
                  title={`${b.name} — clique e depois clique na planta, ou arraste`}
                >
                  <BlockThumb block={b} />
                  <span className="block__name">{b.name}</span>
                  <span className="block__meta">
                    {formatCm(b.defaultSize.w)} × {formatCm(b.defaultSize.d)} ·{' '}
                    {DISCIPLINE_LABEL[b.discipline]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  )
}

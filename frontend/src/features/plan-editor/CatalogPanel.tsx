import { Search } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { CATALOG } from '@/core/blocks/catalog'
import { buildSymbol } from '@/core/blocks/symbol'
import type { BlockDef } from '@/core/blocks/types'
import { entitiesBBox } from '@/core/drawing/bounds'
import { compileView } from '@/core/drawing/compile'
import type { Entity } from '@/core/drawing/entities'
import { OPENING_DEFS, type OpeningDef } from '@/core/project/openings'
import { drawingEntities } from '@/core/project/render'
import { formatLength, UNIT_LABEL } from '@/core/units'
import { primitivesToSvg } from '@/render/svg/primitives-to-svg'
import { SvgNodeView } from '@/render/svg/SvgNodeView'
import { useEditor } from './store'
import { useUnits } from './units-pref'

const DISCIPLINE_LABEL: Record<BlockDef['discipline'], string> = {
  layout: 'Layout',
  marcenaria: 'Marcenaria',
  eletrica: 'Elétrica',
  revestimentos: 'Revestimentos',
  hidraulica: 'Hidráulica',
}

/** Miniatura (SVG em "mm" de miniatura) de entidades quaisquer, enquadradas. */
function thumbNode(es: Entity[]) {
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

/** Miniatura gerada pelo mesmo núcleo que desenha a planta e o PDF. */
const BlockThumb = memo(function BlockThumb({ block }: { block: BlockDef }) {
  const node = useMemo(() => thumbNode(buildSymbol(block.symbol, block.defaultSize)), [block])
  return (
    <span className="block__thumb">
      <SvgNodeView node={node} width={50} height={50} />
    </span>
  )
})

/** Miniatura de esquadria: um trecho de parede com o vão. */
const OpeningThumb = memo(function OpeningThumb({ def }: { def: OpeningDef }) {
  const node = useMemo(() => {
    const len = def.widthMm + 500
    const wall = {
      id: 'w',
      kind: 'wall' as const,
      points: [
        { x: 0, y: 0 },
        { x: len, y: 0 },
      ],
      closed: false,
      thicknessMm: 150,
    }
    const opening = {
      id: 'o',
      wallId: 'w',
      segment: 0,
      offsetMm: len / 2,
      widthMm: def.widthMm,
      heightMm: def.heightMm,
      sillMm: def.sillMm,
      type: def.type,
      hinge: 'start' as const,
      side: 'right' as const,
    }
    return thumbNode(drawingEntities(wall, 50, [opening]))
  }, [def])
  return (
    <span className="block__thumb">
      <SvgNodeView node={node} width={50} height={50} />
    </span>
  )
})

const OPENINGS = 'Esquadrias'

function OpeningsSection({ query }: { query: string }) {
  const unit = useUnits((u) => u.item)
  const placing = useEditor((s) => (s.tool === 'opening' ? s.placeOpeningType : null))
  const startOpening = useEditor((s) => s.startOpening)
  const q = query.trim().toLowerCase()
  const list = OPENING_DEFS.filter(
    (d) => !q || d.name.toLowerCase().includes(q) || 'esquadrias porta janela'.includes(q),
  )
  if (!list.length) return null
  return (
    <section>
      <h3>Esquadrias · na parede</h3>
      <ul className="block-list">
        {list.map((d) => (
          <li key={d.type}>
            <button
              type="button"
              className={`block ${placing === d.type ? 'block--active' : ''}`}
              data-testid={`opening-${d.type}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-prancheta-opening', d.type)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => startOpening(d.type)}
              title={`${d.name}: clique e depois clique sobre uma parede`}
            >
              <OpeningThumb def={d} />
              <span className="block__name">{d.name}</span>
              <span className="block__meta">
                {formatLength(d.widthMm, unit)} × {formatLength(d.heightMm, unit)}{' '}
                {UNIT_LABEL[unit]}
                {d.sillMm ? ` · p${formatLength(d.sillMm, unit)}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CatalogPanel() {
  const unit = useUnits((u) => u.item)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const categories = useMemo(() => [...new Set(CATALOG.map((b) => b.category))], [])
  const placing = useEditor((s) => (s.tool === 'place' ? s.placeBlockId : null))
  const startPlacing = useEditor((s) => s.startPlacing)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = CATALOG.filter(
      (b) =>
        (!category || b.category === category) &&
        (!q || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)),
    )
    const map = new Map<string, BlockDef[]>()
    for (const b of list) map.set(b.category, [...(map.get(b.category) ?? []), b])
    return [...map.entries()]
  }, [query, category])

  return (
    <aside className="panel panel--catalog" data-testid="catalog">
      <h2>Blocos</h2>
      <label className="search">
        <Search size={14} strokeWidth={1.5} />
        <input
          type="search"
          placeholder="Buscar bloco"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar bloco"
        />
      </label>
      <div className="chips" role="group" aria-label="Filtrar por categoria">
        {[null, OPENINGS, ...categories].map((c) => (
          <button
            key={c ?? 'todos'}
            type="button"
            className="chip"
            aria-pressed={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c ?? 'Todos'}
          </button>
        ))}
      </div>
      {(!category || category === OPENINGS) && <OpeningsSection query={query} />}
      {category !== OPENINGS &&
        groups.map(([cat, blocks]) => (
          <section key={cat}>
            <h3>{cat}</h3>
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
                    title={`${b.name} (${DISCIPLINE_LABEL[b.discipline]}): clique e depois clique na planta, ou arraste`}
                  >
                    <BlockThumb block={b} />
                    <span className="block__name">{b.name}</span>
                    <span className="block__meta">
                      {formatLength(b.defaultSize.w, unit)} × {formatLength(b.defaultSize.d, unit)}{' '}
                      {UNIT_LABEL[unit]}
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

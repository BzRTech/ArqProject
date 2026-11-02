import { createElement, type ReactElement } from 'react'
import type { SvgNode } from './svg-node'

/** "stroke-width" → "strokeWidth" (React exige camelCase nos atributos SVG). */
const reactName = (k: string) =>
  k.startsWith('data-') ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

function render(node: SvgNode, key?: number): ReactElement {
  const props: Record<string, unknown> = { key }
  for (const [k, v] of Object.entries(node.attrs)) props[reactName(k)] = v
  const children = node.children?.map((c, i) => render(c, i)) ?? []
  if (node.text) children.push(node.text as unknown as ReactElement)
  return createElement(node.tag, props, ...children)
}

/** Desenha uma árvore SVG do núcleo como elementos React (mesma saída do PDF). */
export function SvgNodeView({ node, ...rest }: { node: SvgNode } & Record<string, unknown>) {
  const root = render(node)
  return createElement(root.type, { ...(root.props as object), ...rest })
}

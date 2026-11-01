import type { SvgNode } from './svg-node'

const escapeText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;')

/** Serializa a árvore em markup SVG (usado pelo PDF e por testes). */
export function toMarkup(node: SvgNode): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(String(v))}"`)
    .join('')
  const inner =
    (node.children ?? []).map(toMarkup).join('') + (node.text ? escapeText(node.text) : '')
  return inner ? `<${node.tag}${attrs}>${inner}</${node.tag}>` : `<${node.tag}${attrs}/>`
}

/** Árvore SVG neutra: serve tanto para gerar markup (PDF) quanto elementos React (tela). */
export interface SvgNode {
  tag: string
  attrs: Record<string, string | number>
  children?: SvgNode[]
  text?: string
}

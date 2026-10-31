/**
 * Avaliador de expressões numéricas para símbolos paramétricos (sem `eval`).
 * Gramática: + - * / ( ), números, variáveis (w, d, i, n…) e funções min, max, round,
 * floor, ceil, abs, sin, cos (em graus). Ex.: "max(2, round(w / 450))", "w/2 - 30".
 */

type Node =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'neg'; a: Node }
  | { t: 'bin'; op: '+' | '-' | '*' | '/'; a: Node; b: Node }
  | { t: 'call'; fn: string; args: Node[] }

const FUNCS: Record<string, (...xs: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  /** Trigonometria em GRAUS. */
  sin: (deg: number) => Math.sin((deg * Math.PI) / 180),
  cos: (deg: number) => Math.cos((deg * Math.PI) / 180),
}

export class ExprError extends Error {}

function tokenize(src: string): string[] {
  const tokens = src.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|[-+*/(),]|\S/g)
  if (!tokens) throw new ExprError(`Expressão vazia: "${src}"`)
  return tokens
}

function parse(src: string): Node {
  const tokens = tokenize(src)
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const expect = (tok: string) => {
    if (next() !== tok) throw new ExprError(`Esperava "${tok}" em "${src}"`)
  }

  function expr(): Node {
    let node = term()
    while (peek() === '+' || peek() === '-') {
      const op = next() as '+' | '-'
      node = { t: 'bin', op, a: node, b: term() }
    }
    return node
  }
  function term(): Node {
    let node = factor()
    while (peek() === '*' || peek() === '/') {
      const op = next() as '*' | '/'
      node = { t: 'bin', op, a: node, b: factor() }
    }
    return node
  }
  function factor(): Node {
    const tok = next()
    if (tok === undefined) throw new ExprError(`Fim inesperado em "${src}"`)
    if (tok === '-') return { t: 'neg', a: factor() }
    if (tok === '+') return factor()
    if (tok === '(') {
      const n = expr()
      expect(')')
      return n
    }
    if (/^\d/.test(tok)) return { t: 'num', v: Number(tok) }
    if (/^[A-Za-z_]/.test(tok)) {
      if (peek() === '(') {
        next()
        if (!(tok in FUNCS)) throw new ExprError(`Função desconhecida "${tok}"`)
        const args: Node[] = []
        if (peek() !== ')') {
          args.push(expr())
          while (peek() === ',') {
            next()
            args.push(expr())
          }
        }
        expect(')')
        return { t: 'call', fn: tok, args }
      }
      return { t: 'var', name: tok }
    }
    throw new ExprError(`Símbolo inesperado "${tok}" em "${src}"`)
  }

  const root = expr()
  if (pos !== tokens.length) throw new ExprError(`Sobrou "${tokens[pos]}" em "${src}"`)
  return root
}

function evaluate(n: Node, vars: Record<string, number>): number {
  switch (n.t) {
    case 'num':
      return n.v
    case 'var': {
      const v = vars[n.name]
      if (v === undefined) throw new ExprError(`Variável desconhecida "${n.name}"`)
      return v
    }
    case 'neg':
      return -evaluate(n.a, vars)
    case 'bin': {
      const a = evaluate(n.a, vars)
      const b = evaluate(n.b, vars)
      if (n.op === '+') return a + b
      if (n.op === '-') return a - b
      if (n.op === '*') return a * b
      if (b === 0) throw new ExprError('Divisão por zero')
      return a / b
    }
    case 'call':
      return FUNCS[n.fn]!(...n.args.map((x) => evaluate(x, vars)))
  }
}

const cache = new Map<string, Node>()

/** Número literal ou expressão em texto. */
export type Num = number | string

export function evalNum(value: Num, vars: Record<string, number>): number {
  if (typeof value === 'number') return value
  let ast = cache.get(value)
  if (!ast) {
    ast = parse(value)
    cache.set(value, ast)
  }
  return evaluate(ast, vars)
}

/** Valida a sintaxe sem avaliar (para validar blocos vindos do banco). */
export function checkExpr(value: Num): void {
  if (typeof value === 'string') parse(value)
}

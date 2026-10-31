import { describe, expect, it } from 'vitest'
import { checkExpr, evalNum, ExprError } from './expr'

const v = { w: 1600, d: 2000, i: 2, n: 4 }

describe('evalNum', () => {
  it.each([
    [1234, 1234],
    ['w', 1600],
    ['w/2 - 30', 770],
    ['-d + 100', -1900],
    ['(w - 3*60) / 2', 710],
    ['max(2, round(w / 450))', 4],
    ['min(w, d) / 10', 160],
    ['i * w / n', 800],
    ['2.5 * 2', 5],
  ])('%s = %d', (expr, expected) => {
    expect(evalNum(expr, v)).toBeCloseTo(expected)
  })

  it.each(['w +', 'foo(1)', 'w ** 2', '(w', 'x', '1/0', 'w w'])('"%s" é inválida', (e) => {
    expect(() => evalNum(e, v)).toThrow(ExprError)
  })

  it('checkExpr só valida a sintaxe', () => {
    expect(() => checkExpr('w + q')).not.toThrow()
    expect(() => checkExpr('w +')).toThrow(ExprError)
  })
})

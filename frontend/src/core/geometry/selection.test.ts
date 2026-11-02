import { describe, expect, it } from 'vitest'
import { rectFromCorners, segmentTouchesRect, shapeInRect } from './bbox'
import { vec } from './vec'

const r = rectFromCorners(vec(100, 100), vec(0, 0)) // cantos em qualquer ordem
const square = (x: number, y: number, s: number) => ({
  points: [vec(x, y), vec(x + s, y), vec(x + s, y + s), vec(x, y + s)],
  closed: true,
})

describe('seleção por janela', () => {
  it('janela: só o que está inteiro dentro', () => {
    expect(shapeInRect(r, square(10, 10, 20), 'window')).toBe(true)
    expect(shapeInRect(r, square(90, 10, 20), 'window')).toBe(false)
  })
  it('cruzamento: basta tocar', () => {
    expect(shapeInRect(r, square(90, 10, 20), 'crossing')).toBe(true)
    expect(shapeInRect(r, square(200, 200, 20), 'crossing')).toBe(false)
  })
  it('segmento que atravessa o retângulo sem ponta dentro conta no cruzamento', () => {
    expect(segmentTouchesRect(r, vec(-50, 50), vec(150, 50))).toBe(true)
    expect(shapeInRect(r, { points: [vec(-50, 50), vec(150, 50)], closed: false }, 'window')).toBe(
      false,
    )
  })
})

import { describe, expect, it } from 'vitest'
import type { Opening, Wall } from './schema'
import { wallsShape } from './wall-union'

/**
 * O polygon-clipping lançava "Unable to complete output ring" com pontos quase iguais vindos de
 * ponto flutuante (cantos fora do esquadro + paredes que se cruzam). A tela do editor quebrava
 * e, como o projeto fica salvo, quebrava de novo ao abrir.
 */

const room = (id: string, pts: [number, number][], t: number): Wall => ({
  id,
  kind: 'wall',
  points: pts.map(([x, y]) => ({ x, y })),
  closed: true,
  thicknessMm: t,
})

const door = (id: string, wallId: string, segment: number, offsetMm: number, widthMm: number) =>
  ({
    id,
    wallId,
    segment,
    offsetMm,
    widthMm,
    heightMm: 2100,
    sillMm: 0,
    type: 'porta-abrir',
    hinge: 'start',
    side: 'left',
  }) as Opening

/** Gerador determinístico (LCG), para o teste ser reprodutível. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}

describe('wallsShape — robustez numérica', () => {
  it('casos que lançavam erro agora desenham as paredes', () => {
    const cases: [Wall[], Opening[]][] = [
      [
        [
          room(
            'w0',
            [
              [-657, -782],
              [3635, -605],
              [3677, 3192],
              [-657, 3192],
            ],
            120,
          ),
          room(
            'w1',
            [
              [-390, -257],
              [5262, -257],
              [4936, 1235],
              [-390, 1410],
            ],
            120,
          ),
        ],
        [
          door('a', 'w0', 0, 887, 799),
          door('b', 'w0', 0, 718, 1095),
          door('c', 'w0', 0, 709, 986),
          door('d', 'w1', 1, 744, 856),
          door('e', 'w1', 2, 552, 919),
          door('f', 'w1', 0, 1238, 957),
        ],
      ],
      [
        [
          room(
            'w0',
            [
              [1158, 65],
              [6325, 65],
              [5644, 2281],
              [1158, 1702],
            ],
            200,
          ),
          room(
            'w1',
            [
              [827, -456],
              [3017, -1047],
              [2734, 1918],
              [827, 1918],
            ],
            150,
          ),
        ],
        [door('a', 'w1', 1, 774, 844), door('b', 'w1', 2, 1390, 1047)],
      ],
      [
        [
          room(
            'w0',
            [
              [1511, 498],
              [4177, 498],
              [3642, 2271],
              [1511, 2127],
            ],
            200,
          ),
          room(
            'w1',
            [
              [503, -430],
              [4862, -861],
              [5240, 4223],
              [503, 4223],
            ],
            200,
          ),
        ],
        [
          door('a', 'w0', 2, 1494, 907),
          door('b', 'w0', 3, 641, 857),
          door('c', 'w1', 1, 643, 807),
          door('d', 'w1', 1, 1381, 1082),
          door('e', 'w1', 2, 1307, 731),
        ],
      ],
    ]
    for (const [walls, openings] of cases) {
      const shape = wallsShape(walls, openings)
      expect(shape.length).toBeGreaterThan(0)
    }
  })

  it('nunca lança: 1000 plantas aleatórias com cantos tortos, cruzamentos e vãos', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const r = rng(seed)
      const int = (a: number, b: number) => Math.round(a + r() * (b - a))
      const walls: Wall[] = []
      const openings: Opening[] = []
      for (let k = 0, n = int(1, 3); k < n; k++) {
        const [x, y, w, d] = [int(-1000, 3000), int(-1000, 1000), int(1500, 6000), int(1500, 5000)]
        const pts: [number, number][] = [
          [x, y],
          [x + w, y],
          [x + w, y + d],
          [x, y + d],
        ]
        if (r() < 0.7) {
          const i = int(0, 3)
          pts[i] = [pts[i]![0] + int(-700, 700), pts[i]![1] + int(-700, 700)]
        }
        walls.push(room(`w${k}`, pts, [100, 120, 150, 200][int(0, 3)]!))
        for (let j = 0, m = int(0, 3); j < m; j++)
          openings.push(door(`o${k}${j}`, `w${k}`, int(0, 3), int(500, 1500), int(600, 1200)))
      }
      expect(() => wallsShape(walls, openings), `semente ${seed}`).not.toThrow()
    }
  })
})

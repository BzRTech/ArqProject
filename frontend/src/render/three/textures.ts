import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** Textura procedural de madeira (veio em listras), sem arquivos de terceiros. */
export function woodTexture(base: string, grain: string, seed: number, vertical = true) {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 60; i++) {
    const pos = rnd() * size
    ctx.strokeStyle = grain
    ctx.globalAlpha = 0.15 + rnd() * 0.35
    ctx.lineWidth = 0.5 + rnd() * 2.5
    ctx.beginPath()
    for (let t = 0; t <= size; t += 8) {
      const wobble = Math.sin((t + seed) / (18 + rnd() * 6)) * 3
      if (vertical) ctx.lineTo(pos + wobble, t)
      else ctx.lineTo(t, pos + wobble)
    }
    ctx.stroke()
  }
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Textura lisa com leve ruído (MDF liso). */
export function solidTexture(color: string, seed: number) {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)
  let s = seed
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)'
    ctx.fillRect(rnd() * size, rnd() * size, 1, 1)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

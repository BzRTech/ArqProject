import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import {
  extractSegments,
  findSegment,
  readFirstPage,
} from '../src/render/pdf/testing/pdfMeasure.ts'

const shot = (name: string) => `test-results/screenshots/${name}.png`

test('início mostra a API saudável via proxy do Vite', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('health')).toContainText('ok · banco ok')
  await page.screenshot({ path: shot('01-inicio') })
})

test('catálogo de primitivas: prancha na tela', async ({ page }) => {
  await page.goto('/dev/primitivas')
  const sheet = page.getByTestId('sheet')
  await expect(sheet).toBeVisible()
  for (const role of [
    'paredes',
    'porta',
    'janela',
    'cotas',
    'hatch',
    'chain-dimension',
    'graphic-scale',
  ]) {
    await expect(sheet.locator(`g[data-role="${role}"]`).first()).toBeAttached()
  }
  await expect(sheet.locator('text', { hasText: '14,35 m²' })).toHaveCount(1)
  await expect(sheet.locator('text', { hasText: '45,3' })).toHaveCount(1)
  await page.screenshot({ path: shot('02-primitivas-folha') })

  // Zoom na vista frontal do rack (canto superior direito da folha)
  const canvas = page.getByTestId('sheet-canvas')
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.45)
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -250)
  await page.screenshot({ path: shot('03-primitivas-zoom-detalhe') })
})

test('catálogo de primitivas: PDF A3 vetorial em escala', async ({ page }) => {
  await page.goto('/dev/primitivas')
  await expect(page.getByTestId('sheet')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-pdf').click(),
  ])
  await download.saveAs('test-results/prancheta-primitivas-a3.pdf')
  const pdf = new Uint8Array(await readFile('test-results/prancheta-primitivas-a3.pdf'))
  const info = readFirstPage(pdf, (d) => new Uint8Array(inflateSync(d)))
  expect(info.widthMm).toBeCloseTo(420, 2)
  expect(info.heightMm).toBeCloseTo(297, 2)
  expect(info.raw).toContain('/FontFile2')
  const segs = extractSegments(info.content, info.heightMm)
  // Medidas esperadas vêm da própria página (mesma fonte que o núcleo usou para desenhar).
  const checks = page.getByTestId('measure-check')
  expect(await checks.count()).toBeGreaterThanOrEqual(2)
  for (const el of await checks.all()) {
    const label = (await el.textContent()) ?? ''
    const c = JSON.parse((await el.getAttribute('data-check'))!) as {
      a: { x: number; y: number }
      b: { x: number; y: number }
    }
    expect(findSegment(segs, [c.a.x, c.a.y], [c.b.x, c.b.y]), label).toBeDefined()
  }
})

test('spike 3D: canvas WebGL renderiza', async ({ page }) => {
  await page.goto('/spikes/3d')
  const canvas = page.getByTestId('three-canvas').locator('canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(1500)
  const drawn = await canvas.evaluate((el: HTMLCanvasElement) => {
    const gl = el.getContext('webgl2') ?? el.getContext('webgl')
    if (!gl) return false
    const px = new Uint8Array(4)
    gl.readPixels(el.width / 2, el.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return !(px[0] === 244 && px[1] === 241 && px[2] === 234)
  })
  expect(drawn).toBe(true)
})

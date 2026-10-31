import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { extractSegments, findSegment, readFirstPage } from '../src/spikes/pdf/pdfMeasure.ts'
import { MODEL_ORIGIN } from '../src/spikes/pdf/sheet.ts'

const shot = (name: string) => `test-results/screenshots/${name}.png`

test('início mostra a API saudável via proxy do Vite', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('health')).toContainText('ok · banco ok')
  await page.screenshot({ path: shot('01-inicio') })
})

test('spike SVG: 2 000 linhas e zoom pela roda do mouse', async ({ page }) => {
  await page.goto('/spikes/svg')
  const canvas = page.getByTestId('panzoom-canvas')
  await expect(canvas.locator('line')).toHaveCount(2000)
  const status = page.getByTestId('panzoom-status')
  const before = await status.textContent()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -600)
  await expect(status).not.toHaveText(before ?? '')
  await page.screenshot({ path: shot('02-svg-panzoom') })
})

test('spike PDF: A3 vetorial, parede de 4 m = 80 mm no papel', async ({ page }) => {
  await page.goto('/spikes/pdf')
  await expect(page.getByTestId('sheet-preview').locator('svg')).toBeVisible()
  await page.screenshot({ path: shot('03-pdf-preview') })

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download-pdf').click(),
  ])
  await download.saveAs('test-results/spike-a3-1-50.pdf')
  const pdf = new Uint8Array(await readFile('test-results/spike-a3-1-50.pdf'))
  const info = readFirstPage(pdf, (d) => new Uint8Array(inflateSync(d)))
  expect(info.widthMm).toBeCloseTo(420, 2)
  expect(info.heightMm).toBeCloseTo(297, 2)
  expect(info.raw).toContain('/FontFile2')

  const segs = extractSegments(info.content, info.heightMm)
  const { x, y } = MODEL_ORIGIN
  expect(findSegment(segs, [x, y], [x + 80, y])).toBeDefined()
})

test('spike 3D: canvas WebGL renderiza', async ({ page }) => {
  await page.goto('/spikes/3d')
  const canvas = page.getByTestId('three-canvas').locator('canvas')
  await expect(canvas).toBeVisible()
  await page.waitForTimeout(1500)
  // Algum pixel diferente do fundo confirma que a cena foi desenhada.
  const drawn = await canvas.evaluate((el: HTMLCanvasElement) => {
    const gl = el.getContext('webgl2') ?? el.getContext('webgl')
    if (!gl) return false
    const px = new Uint8Array(4)
    gl.readPixels(el.width / 2, el.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    return !(px[0] === 244 && px[1] === 241 && px[2] === 234)
  })
  expect(drawn).toBe(true)
  await page.screenshot({ path: shot('04-three') })
})

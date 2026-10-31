import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const shot = (name: string) => `test-results/screenshots/${name}.png`

/** Converte coordenadas do MODELO (mm) em pixels da página, usando a vista atual do canvas. */
async function modelToPage(page: Page, x: number, y: number) {
  const canvas = page.getByTestId('plan-canvas')
  const [scale, tx, ty] = ((await canvas.getAttribute('data-view')) ?? '')
    .split(' ')
    .map(Number) as [number, number, number]
  const box = (await canvas.boundingBox())!
  return { x: box.x + tx + x * scale, y: box.y + ty + y * scale }
}

async function clickModel(page: Page, x: number, y: number) {
  const p = await modelToPage(page, x, y)
  await page.mouse.click(p.x, p.y)
}

async function moveModel(page: Page, x: number, y: number) {
  const p = await modelToPage(page, x, y)
  await page.mouse.move(p.x, p.y)
}

async function setCm(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId)
  await input.fill(value)
  await input.press('Enter')
}

async function placeBlock(page: Page, blockId: string, x: number, y: number) {
  await page.getByTestId(`block-${blockId}`).click()
  await moveModel(page, x, y)
  await clickModel(page, x, y)
}

async function freshEditor(page: Page) {
  await page.goto('/editor')
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('prancheta')
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
}

const items = (page: Page) => page.getByTestId('items').locator('g[data-role="item"]')

test('monta um quarto com blocos, cotas e texto; desfaz, persiste e gera PDF', async ({ page }) => {
  test.setTimeout(90_000)
  await freshEditor(page)

  // Paredes: retângulo 4,40 × 3,80 m pelo eixo, fechado clicando no primeiro ponto
  await page.getByTestId('tool-wall').click()
  for (const [x, y] of [
    [0, 0],
    [4400, 0],
    [4400, 3800],
    [0, 3800],
    [0, 0],
  ] as const) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await expect(page.getByTestId('drawings').locator('g[data-role="drawing-wall"]')).toHaveCount(1)

  // Tapete (redimensionado), cama encostada na parede da direita, criados-mudos
  await placeBlock(page, 'tapete', 3000, 1900)
  await setCm(page, 'item-w', '240')
  await setCm(page, 'item-d', '260')

  await placeBlock(page, 'cama-casal', 3325, 1900)
  await page.keyboard.press('r') // cabeceira para a parede da direita
  await expect(page.getByTestId('item-rotation')).toHaveValue('90')
  for (const y of [870, 2930]) {
    await placeBlock(page, 'criado-mudo', 4120, y)
    await page.keyboard.press('r')
  }

  // Rack do vídeo na parede da esquerda: 318 × 45 cm
  await placeBlock(page, 'rack', 300, 1900)
  await page.keyboard.press('Shift+R')
  await setCm(page, 'item-w', '318')
  await expect(page.getByTestId('item-w')).toHaveValue('318')

  // Guarda-roupa na parede de cima e porta na parede de baixo
  await placeBlock(page, 'guarda-roupa', 2000, 375)
  await placeBlock(page, 'porta', 1400, 3325)
  await page.getByTestId('rotate').click()
  await page.getByTestId('rotate').click()

  await expect(items(page)).toHaveCount(7)

  // Cotas externas
  await page.getByTestId('tool-dimension').click()
  for (const [x, y] of [
    [0, 0],
    [4400, 0],
    [2200, -700],
    [0, 0],
    [0, 3800],
    [-700, 1900],
  ] as const) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await page.keyboard.press('Escape')
  await expect(
    page.getByTestId('drawings').locator('g[data-role="drawing-dimension"]'),
  ).toHaveCount(2)

  // Texto
  await page.getByTestId('tool-text').click()
  await clickModel(page, 1300, 2450)
  await setCm(page, 'text-value', 'QUARTO')
  await page.keyboard.press('Escape')
  await page.keyboard.press('f') // atalho não pode cair dentro do campo de texto
  await expect(
    page.getByTestId('drawings').locator('text').getByText('QUARTO', { exact: true }),
  ).toHaveCount(1)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('10-editor-quarto') })

  // Seleciona a cama e mostra o painel do item
  await clickModel(page, 3100, 1900)
  await expect(page.getByTestId('item-props')).toContainText('Cama de casal')
  await page.screenshot({ path: shot('11-editor-cama-selecionada') })

  // Excluir + desfazer
  await page.keyboard.press('Delete')
  await expect(items(page)).toHaveCount(6)
  await page.getByTestId('undo').click()
  await expect(items(page)).toHaveCount(7)

  // Salvo no navegador: recarregar mantém tudo
  await expect(page.getByTestId('save-status')).toContainText('Salvo neste navegador')
  await page.reload()
  await expect(items(page)).toHaveCount(7)
  await expect(
    page.getByTestId('drawings').locator('g[data-role="drawing-dimension"]'),
  ).toHaveCount(2)

  // Segundo ambiente: sala
  await page.getByTestId('add-env').click()
  await page.getByTestId('tool-wall').click()
  for (const [x, y] of [
    [0, 0],
    [5000, 0],
    [5000, 4000],
    [0, 4000],
    [0, 0],
  ] as const) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await placeBlock(page, 'tapete', 2500, 2200)
  await setCm(page, 'item-w', '250')
  await setCm(page, 'item-d', '200')
  await placeBlock(page, 'sofa', 2500, 3475)
  await page.getByTestId('rotate').click()
  await page.getByTestId('rotate').click()
  await setCm(page, 'item-w', '240')
  await placeBlock(page, 'rack', 2500, 300)
  await setCm(page, 'item-w', '220')
  await placeBlock(page, 'poltrona', 900, 2100)
  await page.keyboard.press('r')
  await placeBlock(page, 'vaso-planta', 4600, 3600)
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('12-editor-sala') })

  // PDF: uma prancha por ambiente
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-pdf').click(),
  ])
  await download.saveAs('test-results/editor-projeto.pdf')
  await expect(page.getByTestId('toolbar-message')).toContainText('2 prancha(s)')
  const pdf = await readFile('test-results/editor-projeto.pdf')
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length).toBe(2)
})

test('planta base: importar imagem e calibrar com medida conhecida', async ({ page }) => {
  await freshEditor(page)
  await page.getByTestId('base-plan-input').setInputFiles('e2e/fixtures/planta-teste.png')
  await expect(page.getByTestId('base-plan')).toBeVisible()
  // Importada com 10 m de largura provisória (1000 px → 10 mm/px). A cota da imagem tem
  // 800 px e vale 6,00 m: depois de calibrar, a imagem deve ter 7,50 m de largura.
  await expect(page.getByTestId('base-plan')).toHaveAttribute('width', '10000')
  await clickModel(page, 1000, 6600)
  await clickModel(page, 9000, 6600)
  await setCm(page, 'calibration-real', '600')
  await page.getByTestId('apply-calibration').click()
  await expect(page.getByTestId('base-plan')).toHaveAttribute('width', '7500')
  await expect(page.getByTestId('base-plan-props')).toContainText('Calibrada')
  await page.keyboard.press('f')
  // Após calibrar (p1 fixo, fator 0,75): pixel (px, py) → modelo (250 + 7,5·px, 1650 + 7,5·py).
  // Paredes da imagem: retângulo de (100,100) a (900,600) px e divisória em x = 500 px.
  const M = (px: number, py: number) => [250 + 7.5 * px, 1650 + 7.5 * py] as const
  await page.getByTestId('tool-wall').click()
  await setCm(page, 'wall-thickness', '12')
  for (const [x, y] of [M(100, 100), M(900, 100), M(900, 600), M(100, 600), M(100, 100)]) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  for (const [x, y] of [M(500, 100), M(500, 380)]) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await page.keyboard.press('Enter')
  for (const [x, y] of [M(500, 460), M(500, 600)]) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('drawings').locator('g[data-role="drawing-wall"]')).toHaveCount(3)
  // Mobília por cima da planta calibrada
  const [qx, qy] = M(300, 300)
  await placeBlock(page, 'cama-casal', qx, qy)
  const [sx, sy] = M(700, 540)
  await placeBlock(page, 'sofa', sx, sy)
  await page.getByTestId('rotate').click()
  await page.getByTestId('rotate').click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('13-editor-planta-base') })
})

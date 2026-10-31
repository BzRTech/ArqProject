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

test('monta um quarto com blocos, porta e janela na parede, cotas e texto; desfaz, persiste e gera PDF', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await freshEditor(page)

  // Ambiente retangular pelas medidas INTERNAS (como na medição da obra): 4,40 × 3,80 m
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '440')
  await setCm(page, 'room-d', '380')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.keyboard.press('f')
  await expect(page.getByTestId('drawings').locator('g[data-role="drawing-wall"]')).toHaveCount(1)

  // Porta na parede de baixo, abrindo para dentro (cursor do lado de dentro)
  await page.getByTestId('tool-door').click()
  await moveModel(page, 1300, 3820)
  await clickModel(page, 1300, 3820)
  await expect(page.getByTestId('opening-props')).toContainText('Porta')
  // Arrasta a porta 20 cm ao longo da parede
  const edgeBefore = await page.getByTestId('opening-edge').inputValue()
  const from = await modelToPage(page, 1300, 3875)
  const to = await modelToPage(page, 1100, 3875)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 5 })
  await page.mouse.up()
  await expect(page.getByTestId('opening-edge')).not.toHaveValue(edgeBefore)

  // Janela de correr na parede de cima, alargada para 1,40 m
  await page.getByTestId('tool-window').click()
  await moveModel(page, 2400, -40)
  await clickModel(page, 2400, -40)
  await setCm(page, 'opening-w', '140')
  await expect(page.getByTestId('opening-w')).toHaveValue('140')
  await page.keyboard.press('Escape')

  // Cotas automáticas da parede (face externa + vãos)
  await clickModel(page, 4475, 1500)
  await expect(page.getByTestId('wall-props')).toContainText('2 vão(s)')
  await page.getByTestId('auto-dims').click()
  await expect(page.getByTestId('drawings').locator('g[data-role="drawing-chain"]')).toHaveCount(4)
  await page.keyboard.press('Escape')

  // Mobília
  await placeBlock(page, 'tapete', 3000, 1900)
  await setCm(page, 'item-w', '240')
  await setCm(page, 'item-d', '260')
  await placeBlock(page, 'cama-casal', 3400, 1900)
  await page.keyboard.press('r') // cabeceira para a parede da direita
  await expect(page.getByTestId('item-rotation')).toHaveValue('90')
  for (const y of [870, 2930]) {
    await placeBlock(page, 'criado-mudo', 4200, y)
    await page.keyboard.press('r')
  }
  await placeBlock(page, 'rack', 225, 1900)
  await page.keyboard.press('Shift+R')
  await setCm(page, 'item-w', '318')
  await placeBlock(page, 'guarda-roupa', 1900, 300)
  await setCm(page, 'item-w', '150')
  await expect(items(page)).toHaveCount(6)

  // Texto
  await page.getByTestId('tool-text').click()
  await clickModel(page, 1300, 2300)
  await setCm(page, 'text-value', 'QUARTO')
  await page.keyboard.press('Escape')
  await page.keyboard.press('f') // atalho não pode cair dentro do campo de texto
  await expect(
    page.getByTestId('drawings').locator('text').getByText('QUARTO', { exact: true }),
  ).toHaveCount(1)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('10-editor-quarto') })

  // Porta selecionada (painel da esquadria)
  await clickModel(page, 1100, 3600)
  await expect(page.getByTestId('opening-props')).toBeVisible()
  await page.screenshot({ path: shot('14-editor-porta-selecionada') })

  // Cama selecionada
  await clickModel(page, 3200, 1900)
  await expect(page.getByTestId('item-props')).toContainText('Cama de casal')
  await page.screenshot({ path: shot('11-editor-cama-selecionada') })

  // Excluir + desfazer
  await page.keyboard.press('Delete')
  await expect(items(page)).toHaveCount(5)
  await page.getByTestId('undo').click()
  await expect(items(page)).toHaveCount(6)

  // Salvo no navegador: recarregar mantém tudo
  await expect(page.getByTestId('save-status')).toContainText('Salvo neste navegador')
  await page.reload()
  await expect(items(page)).toHaveCount(6)
  await expect(page.getByTestId('drawings').locator('g[data-role="drawing-chain"]')).toHaveCount(4)

  // Segundo ambiente: paredes DIGITANDO os comprimentos (5,00 × 4,00 m pelo eixo)
  await page.getByTestId('add-env').click()
  await page.getByTestId('tool-wall').click()
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  for (const [x, y, len] of [
    [1500, 0, '500'],
    [5000, 1500, '400'],
    [3500, 4000, '500'],
  ] as const) {
    await moveModel(page, x, y)
    await page.keyboard.type(len)
    await expect(page.getByTestId('typed-length')).toContainText(`${len} cm`)
    await page.keyboard.press('Enter')
  }
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0) // fecha no primeiro ponto
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await clickModel(page, 5000, 2000)
  await expect(page.getByTestId('wall-props')).toContainText('eixo 18,00 m')
  await expect(page.getByTestId('wall-props')).toContainText('fechada')
  await page.keyboard.press('Escape')

  await page.getByTestId('opening-janela-correr-4').click()
  await moveModel(page, 2500, 60)
  await clickModel(page, 2500, 60)
  await page.getByTestId('opening-porta-correr').click()
  await moveModel(page, 4940, 3000)
  await clickModel(page, 4940, 3000)
  await page.keyboard.press('Escape')
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
  // Uma cota manual
  await page.getByTestId('tool-dimension').click()
  for (const [x, y] of [
    [0, 0],
    [0, 4000],
    [-300, 2000],
  ] as const) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await page.keyboard.press('Escape')
  await expect(
    page.getByTestId('drawings').locator('g[data-role="drawing-dimension"]'),
  ).toHaveCount(1)
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

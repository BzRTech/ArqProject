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
        localStorage.removeItem('prancheta.backup')
        const req = indexedDB.deleteDatabase('prancheta')
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
}

/** Acesso ao store do editor exposto em dev (`window.__editor`). */
type P = { x: number; y: number }
type EditorWindow = {
  __editor: {
    getState: () => { project: { environments: { items: { position: P; markerOffset?: P }[] }[] } }
  }
}

const items = (page: Page) => page.getByTestId('items').locator('g[data-role="item"]')

test('monta um quarto com blocos, porta e janela na parede, cotas e texto; desfaz, persiste e gera PDF', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await freshEditor(page)

  // Ambiente retangular pelas medidas INTERNAS (como na medição da obra): 4,40 × 3,80 m
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40') // paredes em metros (padrão)
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.keyboard.press('f')
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '1')

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
    [1500, 0, '5'],
    [5000, 1500, '4'],
    [3500, 4000, '5'],
  ] as const) {
    await moveModel(page, x, y)
    await page.keyboard.type(len)
    await expect(page.getByTestId('typed-length')).toContainText(`${len} m`)
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
  await setCm(page, 'calibration-real', '6')
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
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '3')
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

test('marcadores, legenda, orçamento, área, planilha e PDF com legenda', async ({ page }) => {
  test.setTimeout(120_000)
  await freshEditor(page)

  // Quarto 4,40 × 3,80 m internos + área do ambiente pelas faces internas
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40') // paredes em metros (padrão)
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.getByTestId('wall-area').click()
  await expect(page.getByTestId('area-value')).toHaveText('16,72 m²')
  await setCm(page, 'area-name', 'Quarto')
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')

  // Itens: cama (1), dois criados iguais (2, qtd 2), rack (M01), tapete existente (3)
  await placeBlock(page, 'tapete', 3000, 1900)
  await page.getByTestId('item-existing').check()
  await placeBlock(page, 'cama-casal', 3400, 1900)
  await page.keyboard.press('r')
  await setCm(page, 'item-price', '3.500,00')
  await expect(page.getByTestId('item-total')).toContainText('R$ 3.500,00')
  await page.getByTestId('item-approved').check()
  await setCm(page, 'item-supplier', 'Loja do Centro')
  for (const y of [870, 2930]) {
    await placeBlock(page, 'criado-mudo', 4200, y)
    await page.keyboard.press('r')
    await setCm(page, 'item-price', '890')
  }
  await expect(page.getByTestId('item-marker')).toHaveText('3')
  await placeBlock(page, 'rack', 225, 1900)
  await page.keyboard.press('Shift+R')
  await setCm(page, 'item-w', '318')
  await setCm(page, 'item-price', '12500')
  await expect(page.getByTestId('item-marker')).toHaveText('M01')
  await page.keyboard.press('Escape')

  // Marcadores na planta: criados iguais compartilham o número
  const markers = page.getByTestId('plan-canvas').locator('g[data-role="marcadores"] text')
  await expect(markers).toHaveText(['1', '2', '3', '3', 'M01'])

  // Balão do tapete (1) estava colado no da cama: arrasta para um lugar livre.
  // O tapete em si não pode sair do lugar.
  const rugBefore = await page.evaluate(() => {
    const st = (window as unknown as EditorWindow).__editor.getState()
    return st.project.environments[0].items[0].position
  })
  const m1 = await modelToPage(page, 3000, 1900)
  const m1to = await modelToPage(page, 3000, 2650)
  await page.mouse.move(m1.x, m1.y)
  await page.mouse.down()
  await page.mouse.move(m1to.x, m1to.y, { steps: 6 })
  await page.mouse.up()
  const rugAfter = await page.evaluate(() => {
    const st = (window as unknown as EditorWindow).__editor.getState()
    const it = st.project.environments[0].items[0]
    return { position: it.position, markerOffset: it.markerOffset }
  })
  expect(rugAfter.position).toEqual(rugBefore)
  expect(rugAfter.markerOffset).toEqual({ x: 0, y: 750 })
  // Rótulo QUARTO para o canto livre
  const lab = await modelToPage(page, 2200, 1900)
  const labTo = await modelToPage(page, 1300, 900)
  await page.mouse.move(lab.x, lab.y)
  await page.mouse.down()
  await page.mouse.move(labTo.x, labTo.y, { steps: 6 })
  await page.mouse.up()
  await expect(page.getByTestId('area-props')).toBeVisible()
  await page.keyboard.press('Escape')

  // Resumo do ambiente: legenda agrupada e totais
  const rows = page.getByTestId('legend-row')
  await expect(rows).toHaveCount(4)
  await expect(rows.nth(2)).toContainText('2 un')
  await expect(rows.nth(2)).toContainText('R$ 1.780,00')
  await expect(rows.nth(0)).toContainText('existente')
  await expect(page.getByTestId('env-total')).toHaveText('R$ 17.780,00')
  await expect(page.getByTestId('env-approved')).toHaveText('1/5')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('15-editor-legenda-orcamento') })

  // Item selecionado com o painel de orçamento
  await clickModel(page, 3200, 1900)
  await expect(page.getByTestId('budget-fields')).toBeVisible()
  await page.screenshot({ path: shot('16-editor-item-orcamento') })
  await page.keyboard.press('Escape')

  // Ferramenta Área: um "closet" de 1,50 × 1,00 m no canto
  await page.getByTestId('tool-area').click()
  for (const [x, y] of [
    [600, 2800],
    [2100, 2800],
    [2100, 3800],
    [600, 3800],
    [600, 2800],
  ] as const) {
    await moveModel(page, x, y)
    await clickModel(page, x, y)
  }
  await expect(page.getByTestId('area-value')).toHaveText('1,50 m²')
  await setCm(page, 'area-name', 'Circulação')
  await page.keyboard.press('Escape')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('17-editor-areas') })

  // Planilha (CSV) com todos os itens
  const [csvDl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-csv').click(),
  ])
  await csvDl.saveAs('test-results/itens.csv')
  const csv = await readFile('test-results/itens.csv', 'utf8')
  expect(csv).toContain(
    'Ambiente 1;2;Cama de casal;1;un;158;200;;Loja do Centro;3500,00;3500,00;não;sim;',
  )
  expect(csv).toContain(';M01;Rack / painel de TV;1;un;318;45;')
  expect(csv).toContain('TOTAL;;;;;;;;17780,00')

  // PDF com legenda
  const [pdfDl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-pdf').click(),
  ])
  await pdfDl.saveAs('test-results/editor-legenda.pdf')
  const pdf = await readFile('test-results/editor-legenda.pdf')
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
})

test('unidades: paredes em m ou cm, móveis em cm ou mm, e sufixo digitado manda', async ({
  page,
}) => {
  await freshEditor(page)
  await expect(page.getByTestId('unit-wall')).toHaveAttribute('data-value', 'm')
  await expect(page.getByTestId('unit-item')).toHaveAttribute('data-value', 'cm')

  // Ambiente em metros, mas digitando com sufixo em cm na profundidade
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '3,5')
  await setCm(page, 'room-d', '280cm')
  await expect(page.getByTestId('room-w')).toHaveValue('3,50')
  await expect(page.getByTestId('room-d')).toHaveValue('2,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.getByTestId('wall-area').click()
  await expect(page.getByTestId('area-value')).toHaveText('9,80 m²')
  await page.keyboard.press('Escape')

  // Móvel em cm e depois em mm (mesma medida)
  await placeBlock(page, 'cama-casal', 1750, 1400)
  await expect(page.getByTestId('item-w')).toHaveValue('158')
  await page.getByTestId('unit-item-mm').click()
  await expect(page.getByTestId('item-w')).toHaveValue('1580')
  await setCm(page, 'item-w', '1600')
  await page.getByTestId('unit-item-cm').click()
  await expect(page.getByTestId('item-w')).toHaveValue('160')

  // Preferência fica salva no navegador
  await page.getByTestId('unit-wall-cm').click()
  // Recarrega LOGO depois de editar: nada pode se perder (gravação ao sair da página)
  await page.reload()
  await expect(page.getByTestId('unit-wall')).toHaveAttribute('data-value', 'cm')
  await expect(items(page)).toHaveCount(1)
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '1')
  await expect(page.getByTestId('drawings').locator('g[data-role="drawing-area"]')).toHaveCount(1)
  await page.getByTestId('tool-room').click()
  // A medida padrão do Ambiente (3 m) agora aparece em cm
  await expect(page.getByTestId('room-w')).toHaveValue('300')
  await page.keyboard.press('Escape')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('18-editor-unidades') })
})

test('quarto + banheiro encostados (parede compartilhada) e edição da parede', async ({ page }) => {
  test.setTimeout(90_000)
  await freshEditor(page)
  const wallsState = () =>
    page.evaluate(() => {
      const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
        project: {
          environments: { drawings: { kind: string; points?: P[] }[]; openings: unknown[] }[]
        }
      }
      const e = st.project.environments[0]!
      return {
        walls: e.drawings.filter((d) => d.kind === 'wall').map((d) => d.points),
        openings: e.openings.length,
      }
    })

  // Quarto 4,40 × 3,80 (interno)
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40')
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  // Banheiro 2,00 × 2,50 encostado à direita: canto interno em x = 4,40 + 0,15
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '2')
  await setCm(page, 'room-d', '2,5')
  await moveModel(page, 4550, 0)
  await clickModel(page, 4550, 0)
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '2')

  // Porta entre quarto e banheiro, na parede compartilhada
  await page.getByTestId('tool-door').click()
  await moveModel(page, 4420, 1200)
  await clickModel(page, 4420, 1200)
  await expect(page.getByTestId('opening-props')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('19-quarto-banheiro-parede-compartilhada') })

  // Editar: selecionar o quarto e EMPURRAR a parede de baixo 50 cm (círculo no meio do trecho)
  await clickModel(page, 2000, 3875)
  await expect(page.getByTestId('wall-props')).toBeVisible()
  const from = await modelToPage(page, 2200, 3875)
  const to = await modelToPage(page, 2200, 4375)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
  let st = await wallsState()
  expect(st.walls[0]).toEqual([
    { x: -75, y: -75 },
    { x: 4475, y: -75 },
    { x: 4475, y: 4375 },
    { x: -75, y: 4375 },
  ])
  expect(st.openings).toBe(1) // a porta continua lá

  // Digitar o comprimento do trecho de cima: 5 m. A parede da direita é compartilhada com o
  // banheiro, então quem anda é a da esquerda: o banheiro NÃO muda.
  const banheiro = [
    { x: 4475, y: -75 },
    { x: 6625, y: -75 },
    { x: 6625, y: 2575 },
    { x: 4475, y: 2575 },
  ]
  await setCm(page, 'wall-seg-0', '5')
  st = await wallsState()
  expect(st.walls[0]).toEqual([
    { x: -525, y: -75 },
    { x: 4475, y: -75 },
    { x: 4475, y: 4375 },
    { x: -525, y: 4375 },
  ])
  expect(st.walls[1]).toEqual(banheiro)

  // No banheiro: encurtar o trecho de baixo (o seguinte é o compartilhado) puxa a parede de
  // fora; o quarto não muda
  await clickModel(page, 6625, 1200)
  await expect(page.getByTestId('wall-props')).toBeVisible()
  await setCm(page, 'wall-seg-2', '1,65')
  st = await wallsState()
  expect(st.walls[1]).toEqual([
    { x: 4475, y: -75 },
    { x: 6125, y: -75 },
    { x: 6125, y: 2575 },
    { x: 4475, y: 2575 },
  ])
  expect(st.walls[0]![1]).toEqual({ x: 4475, y: -75 })
  expect(st.walls[0]![2]).toEqual({ x: 4475, y: 4375 })
  await clickModel(page, 1000, 4375)

  // Duplo clique na parede de baixo cria um canto; duplo clique no canto o remove
  const mid = await modelToPage(page, 1000, 4375)
  await page.mouse.dblclick(mid.x, mid.y)
  st = await wallsState()
  expect(st.walls[0]).toHaveLength(5)
  const corner = await modelToPage(page, 1000, 4375)
  await page.mouse.dblclick(corner.x, corner.y)
  st = await wallsState()
  expect(st.walls[0]).toHaveLength(4)

  await page.keyboard.press('f')
  await clickModel(page, -525, 2000)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('20-parede-editada') })
})

test('piso: revestimento com paginação, perda, rodapé sem a porta, orçamento e PDF', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await freshEditor(page)
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40')
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.getByTestId('tool-door').click()
  await moveModel(page, 1300, 3820)
  await clickModel(page, 1300, 3820)
  await page.keyboard.press('Escape')

  // Área do ambiente + porcelanato 90×90
  await clickModel(page, -75, 2000)
  await page.getByTestId('wall-area').click()
  await page.getByTestId('floor-finish').selectOption('porcelanato-90')
  await expect(page.getByTestId('floor-buy')).toHaveText('18,40 m²') // 16,72 m² + 10%
  await setCm(page, 'floor-price', '129,90')
  await expect(page.getByTestId('floor-total')).toHaveText('R$ 2.390,16')
  await page.getByTestId('floor-skirting').check()
  await expect(page.getByTestId('skirting-m')).toHaveText('15,60 m') // 16,40 − porta 0,80
  await setCm(page, 'skirting-price', '35')
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')

  // Resumo: P1 piso e P1 rodapé; total do ambiente
  await expect(page.getByTestId('floor-row')).toHaveCount(2)
  await expect(page.getByTestId('env-total')).toHaveText('R$ 2.936,16')
  await expect(page.getByTestId('floors-layer').locator('line').first()).toBeAttached()
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('21-piso-porcelanato') })

  // Madeira em régua, amarração 1/3, na vertical; sem humanizado
  await clickModel(page, 2200, 1900)
  await expect(page.getByTestId('floor-fields')).toBeVisible()
  await page.getByTestId('floor-finish').selectOption('madeira-20x120')
  await page.getByTestId('floor-angle').selectOption('90')
  await page.screenshot({ path: shot('22-piso-madeira-painel') })
  await page.keyboard.press('Escape')
  await page.getByTestId('humanized').uncheck()
  await page.mouse.move(0, 0)
  await page.screenshot({ path: shot('23-piso-madeira-sem-humanizado') })
  await page.getByTestId('humanized').check()

  // PDF com o piso e a legenda
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-pdf').click(),
  ])
  await dl.saveAs('test-results/piso.pdf')
  const pdf = await readFile('test-results/piso.pdf')
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
})

test('janela gruda no centro, cursor CAD com snap de ponto médio e cantos arrastáveis direto', async ({
  page,
}) => {
  await freshEditor(page)
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40')
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')

  // Janela de 1,20 perto do meio da parede de cima: gruda no centro
  await page.getByTestId('tool-window').click()
  await moveModel(page, 2240, -30)
  await clickModel(page, 2240, -30)
  // (4,55 − 1,20)/2 − 0,075 = 1,60 m livres de cada lado
  await expect(page.getByTestId('opening-clearances')).toContainText('1,60 | 1,60')
  await page.mouse.move(10, 10)
  await page.screenshot({ path: shot('24-janela-centralizada') })
  // Botão "Centralizar" depois de mover para o lado
  await setCm(page, 'opening-edge', '0,5')
  await expect(page.getByTestId('opening-clearances')).not.toContainText('1,60 | 1,60')
  await page.getByTestId('opening-center').click()
  await expect(page.getByTestId('opening-clearances')).toContainText('1,60 | 1,60')
  await page.keyboard.press('Escape')

  // Cursor CAD: cruz e marcador de ponto médio ao desenhar parede
  await expect(page.getByTestId('cad-cursor-toggle')).toBeChecked()
  await page.getByTestId('tool-wall').click()
  await moveModel(page, 2200 + 20, 3875 + 15) // meio da parede de baixo
  await expect(page.getByTestId('snap-midpoint')).toBeVisible()
  await expect(page.getByTestId('cad-cursor').locator('line')).toHaveCount(2)
  await page.screenshot({ path: shot('25-cursor-cad-ponto-medio') })
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  // Canto arrastável sem selecionar a parede antes
  await moveModel(page, -75, -75)
  await expect(page.getByTestId('hover-grip')).toBeVisible()
  const a = await modelToPage(page, -75, -75)
  const b = await modelToPage(page, -75, -575)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
  const first = await page.evaluate(() => {
    const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
      project: { environments: { drawings: { kind: string; points?: P[] }[] }[] }
    }
    return st.project.environments[0]!.drawings.find((d) => d.kind === 'wall')!.points![0]
  })
  expect(first).toEqual({ x: -75, y: -575 }) // x preservado: move pelo deslocamento, sem pular para a grade
  void a
  await page.mouse.move(10, 10)
  await page.screenshot({ path: shot('26-canto-arrastado') })
})

test('seleção por área (janela e cruzamento), manter só cotas, Ctrl+A e medidas ao arrastar canto', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await freshEditor(page)
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40')
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.keyboard.press('Escape')
  await clickModel(page, 2200, -75)
  await page.getByRole('button', { name: 'Cotar parede' }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  const drawings = () =>
    page.evaluate(() => {
      const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
        project: { environments: { drawings: { kind: string }[] }[] }
      }
      return st.project.environments[0]!.drawings.map((d) => d.kind)
    })
  const before = await drawings()
  const chains = before.filter((k) => k === 'chain').length
  const inner = before.filter((k) => k === 'dimension').length
  expect(chains).toBe(4) // por fora, uma cadeia por trecho
  expect(inner).toBe(2) // por dentro, largura e profundidade úteis

  // Cruzamento (da direita para a esquerda) sobre a parede de cima: pega a parede, a cota de
  // fora e a cota interna de cima (que começa na face da parede)
  const a = await modelToPage(page, 3000, -900)
  const b = await modelToPage(page, 1500, 100)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 })
  await expect(page.getByTestId('selection-band')).toBeVisible()
  await page.screenshot({ path: shot('27-selecao-cruzamento') })
  await page.mouse.up()
  // Arrastar não pode marcar os textos (cotas) com a seleção de texto do navegador
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')
  const multi = page.getByTestId('multi-selection')
  await expect(multi).toContainText('Paredes: 1')
  await expect(multi).toContainText('Cotas: 2')
  await page.screenshot({ path: shot('28-varios-selecionados') })
  await multi.getByRole('button', { name: 'Cotas (2)' }).click()
  await page.keyboard.press('Delete')
  let after = await drawings()
  expect(after.filter((k) => k === 'wall')).toHaveLength(1) // a parede ficou
  expect(after.filter((k) => k === 'chain')).toHaveLength(chains - 1)
  expect(after.filter((k) => k === 'dimension')).toHaveLength(inner - 1)

  // Janela (da esquerda para a direita) que corta a parede: só pega o que está inteiro dentro
  const c = await modelToPage(page, -900, -300)
  const d = await modelToPage(page, 2000, 4100)
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  await page.mouse.move(d.x, d.y, { steps: 8 })
  await page.mouse.up()
  // A cota da esquerda cabe inteira; a parede (que vai até x = 4475) não
  const sel = await page.evaluate(() => {
    const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
      selected: { kind: string; id: string }[]
      project: { environments: { drawings: { id: string; kind: string }[] }[] }
    }
    const ds = st.project.environments[0]!.drawings
    return st.selected.map((r) => ds.find((x) => x.id === r.id)?.kind)
  })
  expect(sel).toEqual(['chain'])

  // Ctrl+A seleciona tudo; Shift + clique tira a parede; Delete apaga só as cotas
  await page.mouse.click(10, 10)
  await page.keyboard.press('Control+a')
  await expect(multi).toContainText(`${after.length} objetos selecionados`)
  const w = await modelToPage(page, 2200, 3875)
  await page.keyboard.down('Shift')
  await page.mouse.click(w.x, w.y)
  await page.keyboard.up('Shift')
  await expect(multi).toContainText(`${after.length - 1} objetos selecionados`)
  const beforeDelete = after.length
  await page.keyboard.press('Delete')
  after = await drawings()
  expect(after).toEqual(['wall'])
  // Desfazer devolve tudo de uma vez
  await page.keyboard.press('Control+z')
  expect((await drawings()).length).toBe(beforeDelete)

  // Arrastar um canto em diagonal (passando pelas cotas) não seleciona texto da página
  await moveModel(page, -75, -75)
  await page.mouse.down()
  const diag = await modelToPage(page, -400, -300)
  await page.mouse.move(diag.x, diag.y, { steps: 10 })
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')
  await page.mouse.up()
  await page.keyboard.press('Control+z')

  // Arrastar um canto mostra as cotas dos trechos que mudam e o deslocamento
  await moveModel(page, -75, -75)
  await expect(page.getByTestId('hover-grip')).toBeVisible()
  await page.mouse.down()
  const e = await modelToPage(page, -575, -75)
  await page.mouse.move(e.x, e.y, { steps: 6 })
  await expect(page.getByTestId('drag-delta')).toContainText('Δx -0,50')
  // ...nem durante o arrasto do canto (era o caso que pintava as cotas de azul)
  expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('')
  const guides = page.getByTestId('edit-guides')
  // 2 cotas + os graus dos 2 cantos que saíram do esquadro
  await expect(guides.locator('text')).toHaveCount(4)
  await expect(guides.locator('text', { hasText: '°' })).toHaveCount(2)
  // canto arrastado: 90° − atan(500/3950) = 82,8°
  await expect(guides).toContainText('82,8°')
  // Pelo eixo, em cm como as cotas da prancha: de cima 455 + 50; o da esquerda ficou inclinado
  await expect(guides.locator('text').nth(0)).toHaveText('505')
  await expect(guides.locator('text').nth(1)).toHaveText('398,2')
  await page.screenshot({ path: shot('29-medidas-ao-arrastar-canto') })
  await page.mouse.up()
  await expect(page.getByTestId('edit-guides')).toHaveCount(0)
  await expect(page.getByTestId('drag-delta')).toHaveCount(0)
})

test('paredes tortas que se cruzam não derrubam a tela (nem ao reabrir o projeto salvo)', async ({
  page,
}) => {
  await freshEditor(page)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // Caso real que fazia o polygon-clipping lançar "Unable to complete output ring"
  await page.evaluate(() => {
    type St = {
      project: { environments: Record<string, unknown>[] }
      loadProject: (p: unknown) => void
    }
    const ed = (window as unknown as { __editor: { getState: () => St } }).__editor
    const st = ed.getState()
    const wall = (id: string, pts: number[][], t: number) => ({
      id,
      kind: 'wall',
      points: pts.map(([x, y]) => ({ x, y })),
      closed: true,
      thicknessMm: t,
    })
    const door = (id: string, wallId: string, segment: number, offsetMm: number, w: number) => ({
      id,
      wallId,
      segment,
      offsetMm,
      widthMm: w,
      heightMm: 2100,
      sillMm: 0,
      type: 'porta-abrir',
      hinge: 'start',
      side: 'left',
    })
    const env = {
      ...st.project.environments[0],
      drawings: [
        wall(
          'w0',
          [
            [1511, 498],
            [4177, 498],
            [3642, 2271],
            [1511, 2127],
          ],
          200,
        ),
        wall(
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
      openings: [
        door('a', 'w0', 2, 1494, 907),
        door('b', 'w0', 3, 641, 857),
        door('c', 'w1', 1, 643, 807),
        door('d', 'w1', 1, 1381, 1082),
        door('e', 'w1', 2, 1307, 731),
      ],
    }
    st.loadProject({ ...st.project, environments: [env] })
  })
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '2')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.reload()
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '2')
  await expect(page.getByTestId('error-page')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('auxiliar de ângulo reto ao arrastar canto, e pilares no canto e na parede', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await freshEditor(page)
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40')
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  const wallPts = () =>
    page.evaluate(() => {
      const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
        project: { environments: { drawings: { kind: string; points?: P[] }[] }[] }
      }
      return st.project.environments[0]!.drawings.find((d) => d.kind === 'wall')!.points!
    })
  const dragCorner = async (from: P, to: P, check?: () => Promise<void>) => {
    await moveModel(page, from.x, from.y)
    await expect(page.getByTestId('hover-grip')).toBeVisible()
    await page.mouse.down()
    const b = await modelToPage(page, to.x, to.y)
    await page.mouse.move(b.x, b.y, { steps: 8 })
    if (check) await check()
    await page.mouse.up()
  }

  // Entorta o canto de cima à direita: fica fora do esquadro
  await dragCorner({ x: 4475, y: -75 }, { x: 4775, y: 25 })
  expect((await wallPts())[1]).toEqual({ x: 4775, y: 25 })
  // Com a parede selecionada, os cantos fora do esquadro mostram os graus
  await expect(page.getByTestId('draft').locator('text').first()).toContainText('°')
  await page.mouse.move(10, 10)
  await page.screenshot({ path: shot('31-canto-fora-do-esquadro') })

  // Arrastando de volta para PERTO do esquadro, ele trava exatamente em 90°
  await dragCorner({ x: 4775, y: 25 }, { x: 4492, y: -61 }, async () => {
    await expect(page.getByTestId('snap-right')).toBeVisible()
    // símbolo de ângulo reto (sem texto de graus) nos cantos em esquadro
    await expect(page.getByTestId('edit-guides').locator('polyline').first()).toBeVisible()
    await page.screenshot({ path: shot('32-auxiliar-angulo-reto') })
  })
  expect((await wallPts())[1]).toEqual({ x: 4475, y: -75 })
  await page.keyboard.press('Escape')

  // Pilar no canto: centrado no canto da parede
  await page.getByTestId('tool-column').click()
  await moveModel(page, -70, -80)
  await clickModel(page, -70, -80)
  // Pilar na parede de baixo: centrado no eixo
  await moveModel(page, 2200, 3860)
  await clickModel(page, 2200, 3860)
  await page.keyboard.press('Escape')
  const cols = () =>
    page.evaluate(() => {
      const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
        project: { environments: { drawings: Record<string, unknown>[] }[] }
      }
      return st.project.environments[0]!.drawings.filter((d) => d.kind === 'column')
    })
  let c = await cols()
  expect(c.map((x) => x.at)).toEqual([
    { x: -75, y: -75 },
    { x: 2200, y: 3875 },
  ])
  // Selecionar e mudar a seção para 20 × 40, girar com R
  await clickModel(page, 2200, 3875)
  await expect(page.getByTestId('column-props')).toBeVisible()
  await setCm(page, 'column-d', '40')
  await page.keyboard.press('r')
  c = await cols()
  expect(c[1]).toMatchObject({ widthMm: 200, depthMm: 400 })
  expect(Math.round(Number(c[1]!.rotationDeg)) % 180).toBe(90)
  await page.mouse.move(10, 10)
  await page.screenshot({ path: shot('33-pilares') })
})

test('cotas ligadas: parede (externa + área útil) e posição dos móveis acompanham; tapete por baixo', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await freshEditor(page)
  await page.getByTestId('tool-room').click()
  await setCm(page, 'room-w', '4,40')
  await setCm(page, 'room-d', '3,80')
  await moveModel(page, 0, 0)
  await clickModel(page, 0, 0)
  await page.keyboard.press('Escape')
  await clickModel(page, 2200, -75)
  await page.getByRole('button', { name: 'Cotar parede' }).click()
  type D = {
    kind: string
    id: string
    p1?: P
    p2?: P
    points?: P[]
    ref?: { kind: string; segment?: number; side?: number }
  }
  const dims = () =>
    page.evaluate(() => {
      const st = (window as unknown as EditorWindow).__editor.getState() as unknown as {
        project: { environments: { drawings: Record<string, unknown>[] }[] }
      }
      return st.project.environments[0]!.drawings.filter(
        (d) => d.kind === 'chain' || d.kind === 'dimension',
      )
    }) as Promise<D[]>
  let ds = await dims()
  expect(ds.filter((d) => d.ref?.kind === 'wall-outer')).toHaveLength(4)
  const innerTop = () =>
    dims().then((x) => x.find((d) => d.ref?.kind === 'wall-inner' && d.ref.segment === 0)!)
  expect((await innerTop()).p2).toEqual({ x: 4400, y: 0 }) // área útil: 4,40

  // Cama e, DEPOIS, um tapete por baixo dela: o tapete não cobre a cama
  await page.keyboard.press('Escape')
  await placeBlock(page, 'cama-casal', 2200, 1100)
  await placeBlock(page, 'tapete', 2200, 1600)
  await page.keyboard.press('Escape')
  await clickModel(page, 2200, 900)
  await expect(page.getByTestId('item-props')).toContainText('Cama de casal')

  // Cotar a posição da cama: lados com folga até a parede
  await page.getByTestId('item-dims').click()
  ds = await dims()
  const bedDims = ds.filter((d) => d.ref?.kind === 'item')
  expect(bedDims.length).toBeGreaterThanOrEqual(2)
  const left = () => dims().then((x) => x.find((d) => d.ref?.kind === 'item' && d.ref.side === 3)!)
  // cama 158 de largura centrada em x = 2200: lado esquerdo em 1410 → folga 1410
  expect((await left()).p2!.x).toBe(0)
  expect((await left()).p1!.x).toBe(1410)

  // Mover a cama 30 cm para a direita: a cota acompanha
  const from = await modelToPage(page, 2200, 900)
  const to = await modelToPage(page, 2500, 900)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
  expect((await left()).p1!.x).toBe(1710)

  // Aumentar o quarto (trecho de cima = 5 m): a cota de fora e a área útil acompanham
  await clickModel(page, 2200, -75)
  await setCm(page, 'wall-seg-0', '5')
  const top = await innerTop()
  expect(Math.abs(top.p2!.x - top.p1!.x)).toBe(4850) // 5,00 de eixo − 0,15 = 4,85 útil
  await page.keyboard.press('Escape')
  await page.keyboard.press('f')
  await page.mouse.move(10, 10)
  await page.screenshot({ path: shot('35-cotas-ligadas') })
})

test('botão do meio (scroll) arrasta a vista, sem a rolagem automática do navegador', async ({
  page,
}) => {
  await freshEditor(page)
  const canvas = page.getByTestId('plan-canvas')
  // No Windows, apertar o botão do meio liga a "rolagem automática" do Chrome/Edge, que toma
  // conta do mouse: o desenho precisa cancelar essa ação padrão (mousedown e auxclick).
  const prevented = await canvas.evaluate((el) => {
    const ev = (type: string) => {
      const e = new MouseEvent(type, { button: 1, buttons: 4, bubbles: true, cancelable: true })
      el.dispatchEvent(e)
      return e.defaultPrevented
    }
    return { mousedown: ev('mousedown'), auxclick: ev('auxclick') }
  })
  expect(prevented).toEqual({ mousedown: true, auxclick: true })

  // E o arrasto com o botão do meio move a vista (em qualquer ferramenta)
  await page.getByTestId('tool-wall').click()
  const before = (await canvas.getAttribute('data-view'))!.split(' ').map(Number)
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 300, box.y + 300)
  await page.mouse.down({ button: 'middle' })
  await expect(canvas).toHaveClass(/canvas--panning/)
  await page.mouse.move(box.x + 420, box.y + 360, { steps: 6 })
  await page.mouse.up({ button: 'middle' })
  const after = (await canvas.getAttribute('data-view'))!.split(' ').map(Number)
  expect(after[1]! - before[1]!).toBeCloseTo(120, 0)
  expect(after[2]! - before[2]!).toBeCloseTo(60, 0)
  await expect(canvas).not.toHaveClass(/canvas--panning/)
  // nenhuma parede foi começada pelo arrasto
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '0')
})

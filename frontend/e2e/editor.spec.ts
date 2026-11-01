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

  // Digitar o comprimento do trecho de cima: 5 m → a parede da direita é empurrada junto
  await setCm(page, 'wall-seg-0', '5')
  st = await wallsState()
  expect(st.walls[0]![1]).toEqual({ x: 4925, y: -75 })
  expect(st.walls[0]![2]).toEqual({ x: 4925, y: 4375 })
  // O banheiro, encostado, acompanhou: a parede compartilhada continua uma só
  expect(st.walls[1]).toEqual([
    { x: 4925, y: -75 },
    { x: 6625, y: -75 },
    { x: 6625, y: 2575 },
    { x: 4925, y: 2575 },
  ])

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
  await clickModel(page, -75, 2000)
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
  expect(chains).toBeGreaterThan(1)

  // Cruzamento (da direita para a esquerda) sobre a parede de cima: pega parede + cota de cima
  const a = await modelToPage(page, 3000, -900)
  const b = await modelToPage(page, 1500, 100)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 })
  await expect(page.getByTestId('selection-band')).toBeVisible()
  await page.screenshot({ path: shot('27-selecao-cruzamento') })
  await page.mouse.up()
  const multi = page.getByTestId('multi-selection')
  await expect(multi).toContainText('Paredes: 1')
  await expect(multi).toContainText('Cotas: 1')
  await page.screenshot({ path: shot('28-varios-selecionados') })
  await multi.getByRole('button', { name: 'Cotas (1)' }).click()
  await page.keyboard.press('Delete')
  let after = await drawings()
  expect(after.filter((k) => k === 'wall')).toHaveLength(1) // a parede ficou
  expect(after.filter((k) => k === 'chain')).toHaveLength(chains - 1)

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
  await page.keyboard.press('Delete')
  after = await drawings()
  expect(after).toEqual(['wall'])
  // Desfazer devolve tudo de uma vez
  await page.keyboard.press('Control+z')
  expect((await drawings()).length).toBe(chains)

  // Arrastar um canto mostra as cotas dos trechos que mudam e o deslocamento
  await moveModel(page, -75, -75)
  await expect(page.getByTestId('hover-grip')).toBeVisible()
  await page.mouse.down()
  const e = await modelToPage(page, -575, -75)
  await page.mouse.move(e.x, e.y, { steps: 6 })
  await expect(page.getByTestId('drag-delta')).toContainText('Δx -0,50')
  const guides = page.getByTestId('edit-guides')
  await expect(guides.locator('text')).toHaveCount(2)
  // Pelo eixo, em cm como as cotas da prancha: de cima 455 + 50; o da esquerda ficou inclinado
  await expect(guides.locator('text').nth(0)).toHaveText('505')
  await expect(guides.locator('text').nth(1)).toHaveText('398,2')
  await page.screenshot({ path: shot('29-medidas-ao-arrastar-canto') })
  await page.mouse.up()
  await expect(page.getByTestId('edit-guides')).toHaveCount(0)
  await expect(page.getByTestId('drag-delta')).toHaveCount(0)
})

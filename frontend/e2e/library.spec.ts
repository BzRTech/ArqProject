import { expect, test, type Page } from '@playwright/test'

/** Fase 3: bancos (global + escritório). Precisa do backend rodando (docker compose up). */
const shot = (name: string) => `test-results/screenshots/${name}.png`

async function signUp(page: Page) {
  await page.goto('/entrar')
  await page.getByTestId('auth-mode-Criar conta').click()
  await page.getByTestId('auth-name').fill('Bia Banco')
  await page.getByTestId('auth-email').fill(`banco-${Date.now()}-${Math.random()}@prancheta.local`)
  await page.getByTestId('auth-password').fill('senha-boa-e2e-9')
  await page.getByTestId('auth-org').fill('Estúdio Banco')
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/projetos$/)
}

type Editor = {
  __editor: {
    getState(): {
      addItem(blockId: string, p: { x: number; y: number }): string
      project: {
        environments: { items: { blockId: string; blockVersion: number; name: string }[] }[]
        librarySnapshots: { rules: { version: number; front: { gapMm: number } } }
      }
    }
  }
}
const editor = (page: Page) =>
  page.evaluate(() => (window as unknown as Editor).__editor.getState().project)

/** Abre a entrada (personalizada/do escritório) e troca o nome. */
async function rename(page: Page, id: string, name: string) {
  await page
    .locator(`[data-testid="library-row"][data-scope="org"][data-id="${id}"]`)
    .getByTestId('library-edit')
    .click()
  await page.getByTestId('entry-name').fill(name)
  await page.getByTestId('entry-save').click()
  await expect(page.getByTestId('entry-dialog')).not.toBeVisible()
}

test('banco do escritório: novo MDF, personalizar bloco e regras, editor usa e avisa versão nova', async ({
  page,
}) => {
  await signUp(page)
  await page.goto('/banco')
  await expect(page.getByTestId('library-rows').getByTestId('library-row').first()).toBeVisible()
  expect(await page.getByTestId('library-row').count()).toBeGreaterThanOrEqual(30)

  // MDF novo do escritório
  await page.getByTestId('library-tab-materials').click()
  await page.getByTestId('library-new').click()
  await page.getByTestId('entry-name').fill('Nogueira Escura')
  await expect(page.getByTestId('entry-id')).toHaveValue('nogueira-escura')
  await page.getByTestId('entry-save').click()
  const mine = page.locator('[data-testid="library-row"][data-id="nogueira-escura"]')
  await expect(mine).toContainText('Escritório')

  // Personalizar o sofá global
  await page.getByTestId('library-tab-items').click()
  await page.getByTestId('library-search').fill('sofa')
  await page
    .locator('[data-testid="library-row"][data-scope="global"][data-id="sofa"]')
    .getByTestId('library-override')
    .click()
  await page.getByTestId('entry-name').fill('Sofá do escritório')
  await page.getByTestId('entry-save').click()
  const sofa = page.locator('[data-testid="library-row"][data-scope="org"][data-id="sofa"]')
  await expect(sofa).toContainText('Personalizada')
  // Personalizar = v2 (global + 1); salvar com o nome novo = v3
  await expect(sofa).toContainText('v3')
  await page.screenshot({ path: shot('fase3-01-banco') })

  // Projeto: catálogo e MDF vêm do banco do escritório
  await page.goto('/projetos')
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Sala com banco')
  await page.getByTestId('new-project-submit').click()
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  await page.getByTestId('stage-layout').click()
  await expect(page.getByTestId('block-sofa')).toContainText('Sofá do escritório')
  await page.evaluate(() => {
    const s = (window as unknown as Editor).__editor.getState()
    s.addItem('sofa', { x: 1500, y: 1000 })
    s.addItem('rack', { x: 1500, y: 3000 })
  })
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  let p = await editor(page)
  expect(p.environments[0]!.items.map((i) => [i.blockId, i.blockVersion, i.name])).toEqual([
    ['sofa', 3, 'Sofá do escritório'],
    ['rack', 1, 'Rack / painel de TV'],
  ])
  await page.getByTestId('stage-marcenaria').click()
  await page.evaluate(() => {
    const s = (
      window as unknown as {
        __editor: {
          getState(): Record<string, (...a: unknown[]) => void> & {
            project: { environments: { items: { id: string }[] }[] }
          }
        }
      }
    ).__editor.getState()
    s.select!({ kind: 'item', id: s.project.environments[0]!.items[1]!.id })
  })
  await expect(page.getByTestId('mdf-nogueira-escura')).toBeVisible()
  const url = page.url()

  // O escritório muda o sofá de novo e as regras (folga de 3 → 2 mm)
  await page.goto('/banco')
  await page.getByTestId('library-search').fill('sofa')
  await rename(page, 'sofa', 'Sofá do escritório (novo desenho)')
  await page.getByTestId('library-tab-rules').click()
  await page
    .locator('[data-testid="library-row"][data-id="padrao"]')
    .getByTestId('library-override')
    .click()
  await page.getByTestId('entry-front.gapMm').fill('2')
  await page.getByTestId('entry-save').click()
  await expect(
    page.locator('[data-testid="library-row"][data-scope="org"][data-id="padrao"]'),
  ).toBeVisible()

  // O projeto não muda sozinho: avisa e atualiza quando pedido
  await page.goto(url)
  await expect(page.getByTestId('library-updates')).toContainText('2 versões novas')
  await page.getByRole('button', { name: 'Ver o que mudou' }).click()
  await expect(page.getByTestId('library-updates-list')).toContainText('versão 3 → 4')
  await expect(page.getByTestId('library-updates-list')).toContainText('Regras de marcenaria')
  await page.screenshot({ path: shot('fase3-02-versao-nova') })
  p = await editor(page)
  expect(p.environments[0]!.items[0]!.blockVersion).toBe(3)
  await page.getByTestId('library-update-all').click()
  await expect(page.getByTestId('library-updates')).toBeHidden()
  p = await editor(page)
  expect(p.environments[0]!.items[0]!.blockVersion).toBe(4)
  expect(p.librarySnapshots.rules.front.gapMm).toBe(2)
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
})

test('importar planilha de MDF para o banco do escritório, com erro por linha', async ({
  page,
}) => {
  await signUp(page)
  await page.goto('/banco')
  await page.getByTestId('library-tab-materials').click()
  await page.getByTestId('library-import').click()
  const csv =
    'id;nome;tipo;cor;fabricante\n' +
    'freijo-x;Freijó X;madeirado;#b88a5a;Fabricante X\n' +
    'ruim;Ruim;liso;azul;\n'
  await page.getByTestId('import-file').setInputFiles({
    name: 'mdf.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  })
  await page.getByTestId('import-run').click()
  await expect(page.getByTestId('import-report')).toContainText('1 novas')
  await expect(page.getByTestId('import-report')).toContainText('linha 3')
  await page.screenshot({ path: shot('fase3-03-importar') })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-testid="library-row"][data-id="freijo-x"]')).toContainText(
    'Escritório',
  )
})

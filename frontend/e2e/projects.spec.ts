import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * Fase 2: contas, escritórios e projetos no servidor. Precisa do backend rodando
 * (docker compose up). Cada teste cria uma conta nova (e-mail único).
 */
const shot = (name: string) => `test-results/screenshots/${name}.png`
const uniq = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`

async function signUp(page: Page, org = 'Estúdio Teste') {
  const email = `e2e-${uniq()}@prancheta.local`
  await page.goto('/entrar')
  await page.getByTestId('auth-mode-Criar conta').click()
  await page.getByTestId('auth-name').fill('Ana Teste')
  await page.getByTestId('auth-email').fill(email)
  await page.getByTestId('auth-password').fill('senha-boa-e2e-9')
  await page.getByTestId('auth-org').fill(org)
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/projetos$/)
  return email
}

async function newProject(page: Page, name: string, client = '') {
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill(name)
  if (client) await page.getByTestId('new-project-client').fill(client)
  await page.getByTestId('new-project-submit').click()
  await expect(page).toHaveURL(/\/projetos\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  return page.url().split('/').pop()!
}

/** Muda o nome do projeto pelo store do editor (exposto em dev). */
async function renameProject(page: Page, name: string) {
  await page.evaluate((n) => {
    ;(
      window as unknown as { __editor: { getState(): { renameProject(n: string): void } } }
    ).__editor
      .getState()
      .renameProject(n)
  }, name)
}

const projectName = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __editor: { getState(): { project: { name: string } } } }
      ).__editor.getState().project.name,
  )

async function login(browser: Browser, email: string) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/entrar')
  await page.getByTestId('auth-email').fill(email)
  await page.getByTestId('auth-password').fill('senha-boa-e2e-9')
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/projetos$/)
  return page
}

test('sem login, /projetos manda para Entrar; senha errada avisa', async ({ page }) => {
  await page.goto('/projetos')
  await expect(page).toHaveURL(/\/entrar\?next=%2Fprojetos$/)
  await page.getByTestId('auth-email').fill('ninguem@prancheta.local')
  await page.getByTestId('auth-password').fill('errada')
  await page.getByTestId('auth-submit').click()
  await expect(page.getByTestId('auth-error')).toContainText('incorretos')
  await page.screenshot({ path: shot('fase2-01-entrar') })
})

test('cria conta, projeto, salva no servidor, reabre e lista com versões e cópia', async ({
  page,
}) => {
  await signUp(page)
  await expect(page.getByTestId('projects-empty')).toBeVisible()
  await expect(page.getByTestId('user-menu')).toContainText('Estúdio Teste')
  const id = await newProject(page, 'Apartamento Centro', 'Família Souza')

  // Editar → "Salvando…" → "Salvo" (PUT com If-Match)
  const put = page.waitForResponse(
    (r) => r.url().endsWith(`/api/projects/${id}/`) && r.request().method() === 'PUT',
  )
  await renameProject(page, 'Apartamento Centro — estudo 2')
  const res = await put
  expect(res.status()).toBe(200)
  expect(res.request().headers()['if-match']).toBe('"1"')
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')

  await page.reload()
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  expect(await projectName(page)).toBe('Apartamento Centro — estudo 2')

  // Lista: cartão com cliente; duplicar; versões
  await page.goto('/projetos')
  const cards = page.getByTestId('project-card')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Família Souza')
  await expect(cards.first()).toContainText('1 ambiente')
  await cards.first().getByTestId('duplicate-project').click()
  await expect(cards).toHaveCount(2)
  await expect(page.getByTestId('project-list')).toContainText('(cópia)')
  await page.screenshot({ path: shot('fase2-02-projetos') })

  await cards.filter({ hasNotText: '(cópia)' }).getByTitle('Versões').click()
  await expect(page.getByTestId('versions-list').locator('li')).toHaveCount(1)
  await page.getByTestId('version-label').fill('Enviado ao cliente')
  await page.getByRole('button', { name: 'Salvar versão atual' }).click()
  await expect(page.getByTestId('versions-list')).toContainText('Enviado ao cliente')
  await page.screenshot({ path: shot('fase2-03-versoes') })
  await page.keyboard.press('Escape')

  // Busca
  await page.getByTestId('project-search').fill('cópia')
  await expect(cards).toHaveCount(1)
})

test('conflito: duas abas no mesmo projeto, a segunda é avisada e escolhe', async ({
  page,
  context,
}) => {
  await signUp(page)
  const id = await newProject(page, 'Casa Praia')
  const other = await context.newPage()
  await other.goto(`/projetos/${id}`)
  await expect(other.getByTestId('save-status')).toHaveText('Salvo')

  // Aba 1 salva primeiro
  await renameProject(page, 'Casa Praia — aba 1')
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  // Aba 2 (ainda na revisão 1) tenta salvar → 409 → aviso, autosave parado
  await renameProject(other, 'Casa Praia — aba 2')
  await expect(other.getByTestId('conflict-banner')).toBeVisible()
  await expect(other.getByTestId('save-status')).toHaveText('Não salvo (conflito)')
  await other.screenshot({ path: shot('fase2-04-conflito') })

  // "Manter a minha" grava por cima
  await other.getByTestId('conflict-mine').click()
  await expect(other.getByTestId('conflict-banner')).toBeHidden()
  await expect(other.getByTestId('save-status')).toHaveText('Salvo')

  // A aba 1 agora está atrasada: ao editar, conflito; "Usar a versão salva" traz a da aba 2
  await renameProject(page, 'Casa Praia — aba 1 de novo')
  await expect(page.getByTestId('conflict-banner')).toBeVisible()
  await page.getByTestId('conflict-server').click()
  await expect(page.getByTestId('conflict-banner')).toBeHidden()
  expect(await projectName(page)).toBe('Casa Praia — aba 2')
  // E volta a salvar normalmente
  await renameProject(page, 'Casa Praia — final')
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  await other.reload()
  await expect(other.getByTestId('save-status')).toHaveText('Salvo')
  expect(await projectName(other)).toBe('Casa Praia — final')
})

test('planta base vai para o S3 do escritório e volta ao reabrir', async ({ page }) => {
  await signUp(page)
  await newProject(page, 'Com planta')
  const put = page.waitForResponse(
    (r) => r.url().includes('/prancheta/orgs/') && r.request().method() === 'PUT',
  )
  await page.getByTestId('base-plan-input').setInputFiles('e2e/fixtures/planta-teste.png')
  expect((await put).status()).toBe(200)
  await expect(page.getByTestId('base-plan')).toBeVisible()
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  // Outro navegador (sem o cache local) baixa do servidor
  const assetId = await page.evaluate(
    () =>
      (
        window as unknown as {
          __editor: {
            getState(): { project: { environments: { basePlan: { assetId: string } }[] } }
          }
        }
      ).__editor.getState().project.environments[0]!.basePlan.assetId,
  )
  expect(assetId).toMatch(/^[0-9a-f-]{36}$/)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('prancheta')
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await expect(page.getByTestId('base-plan')).toHaveAttribute('href', /^data:image\/png/)
})

test('escritório não abre projeto de outro; rascunho local é enviado à conta', async ({
  page,
  browser,
}) => {
  // Rascunho local feito sem conta
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toHaveText('Salvo neste navegador')
  await renameProject(page, 'Rascunho da obra')
  await expect(page.getByTestId('save-status')).toHaveText('Salvo neste navegador')

  const email = await signUp(page, 'Escritório Um')
  await page.getByTestId('import-local-draft').click()
  await expect(page).toHaveURL(/\/projetos\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  expect(await projectName(page)).toBe('Rascunho da obra')
  const url = page.url()

  // Outro escritório: 404 → tela de erro
  const ctx = await browser.newContext()
  const stranger = await ctx.newPage()
  await signUp(stranger, 'Escritório Dois')
  await stranger.goto(url)
  await expect(stranger.getByTestId('load-error')).toContainText('não encontrado')
  await expect(stranger.getByTestId('project-list')).toHaveCount(0)
  // A mesma pessoa entrando de outro navegador vê o projeto na lista
  const again = await login(browser, email)
  await expect(again.getByTestId('project-card')).toHaveCount(1)
  await again.context().close()
  await ctx.close()
})

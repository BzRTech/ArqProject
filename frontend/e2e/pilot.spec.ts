import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

interface EditorState {
  activeEnvId: string
  project: { name: string; environments: { items: unknown[]; perspectives?: unknown[] }[] }
  renameEnvironment(id: string, name: string): void
  addEnvironment(name: string): string
  setRoomSize(size: { w: number; d: number }): void
  addRoom(position: { x: number; y: number }): string
  addWallDims(id: string): void
  addItem(block: string, position: { x: number; y: number }): string
  updateItem(id: string, patch: Record<string, unknown>): void
  openDetail(id: string): void
  renameProject(name: string): void
}

declare global {
  interface Window {
    __editor: { getState(): EditorState }
  }
}

// Optional private PDF stays outside the repository; no customer fixture is committed.
test('piloto integrado: base, marcenaria, perspectiva, PDFs e restauração em nova sessão', async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000)
  const email = `piloto-${Date.now()}@prancheta.local`
  const password = 'senha-boa-e2e-9'
  await page.goto('/entrar')
  await page.getByTestId('auth-mode-Criar conta').click()
  await page.getByTestId('auth-name').fill('Piloto de validação')
  await page.getByTestId('auth-email').fill(email)
  await page.getByTestId('auth-password').fill(password)
  await page.getByTestId('auth-org').fill('Validação local')
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/projetos$/)
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Piloto de validação')
  await page.getByTestId('new-project-submit').click()
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  const projectUrl = page.url()
  await page
    .getByTestId('base-plan-input')
    .setInputFiles(process.env.PILOT_PDF ?? 'e2e/fixtures/planta-teste.png')
  if (process.env.PILOT_PDF) {
    await expect(page.getByTestId('pdf-plan-preview')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('01-pdf-import.png') })
    await page.getByTestId('pdf-plan-import').click()
  }
  await expect(page.getByTestId('base-plan')).toBeVisible()
  const saved = () =>
    page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/projects/' + projectUrl.split('/').pop() + '/') &&
        r.request().method() === 'PUT',
    )
  let put = saved()
  await page.evaluate(() => {
    const s = window.__editor.getState()
    s.renameEnvironment(s.activeEnvId, 'Planta recebida - referência')
    // A separate, explicitly synthetic room exercises geometry without pretending
    // that raster import automatically reconstructed the customer's architecture.
    s.addEnvironment('Ambiente de ensaio - não executivo')
    s.setRoomSize({ w: 4400, d: 3800 })
    const wall = s.addRoom({ x: 0, y: 0 })
    s.addWallDims(wall)
    const sofa = s.addItem('sofa', { x: 1800, y: 2300 })
    s.updateItem(sofa, { unitPriceCents: 459900, supplier: 'Fornecedor de ensaio' })
    const rack = s.addItem('rack', { x: 1800, y: 500 })
    s.updateItem(rack, { sizeMm: { w: 3180, d: 450, h: 400 } })
    s.openDetail(rack)
  })
  expect((await put).status()).toBe(200)
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  await page.getByTestId('stage-pranchas').click()
  await page.locator('[data-testid^="sheet-detail-"]').click()
  await page.screenshot({ path: test.info().outputPath('02-marcenaria.png') })
  await page.getByTestId('stage-3d').click()
  const capture = page.getByRole('button', { name: 'Salvar perspectiva nas pranchas' })
  await expect(capture).toBeEnabled()
  await page.waitForTimeout(1200)
  await capture.click()
  await expect(page.locator('[data-testid^="sheet-perspective-"]')).toHaveCount(1)
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  await page.screenshot({ path: test.info().outputPath('03-perspectiva.png') })
  const download = page.waitForEvent('download')
  await page.getByTestId('sheet-pdf').click()
  const pdfPath = test.info().outputPath('pranchas.pdf')
  await (await download).saveAs(pdfPath)
  expect(
    readFileSync(pdfPath)
      .toString('latin1')
      .match(/\/Type \/Page\b/g),
  ).toHaveLength(4)
  const memo = await page.request.get(
    projectUrl.replace('/projetos/', '/api/projects/') + '/memorial.pdf',
  )
  expect(memo.status()).toBe(200)
  const memoPath = test.info().outputPath('memorial.pdf')
  writeFileSync(memoPath, await memo.body())
  expect(execFileSync('pdftotext', ['-layout', memoPath, '-']).toString('utf8')).toContain(
    'R$ 4.599,00',
  )
  await page.goto('/projetos')
  await page.getByTestId('project-card').getByTitle('Versões').click()
  await page.getByTestId('version-label').fill('Piloto validado')
  await page.getByRole('button', { name: 'Salvar versão atual' }).click()
  await expect(page.getByTestId('versions-list')).toContainText('Piloto validado')
  await page.goto(projectUrl)
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  put = saved()
  await page.evaluate(() => window.__editor.getState().renameProject('Alteração descartável'))
  expect((await put).status()).toBe(200)
  await page.goto('/projetos')
  await page.getByTestId('project-card').getByTitle('Versões').click()
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByTestId('versions-list')
    .locator('li')
    .filter({ hasText: 'Piloto validado' })
    .getByRole('button', { name: 'Restaurar' })
    .click()
  await expect(page.getByTestId('versions-dialog')).not.toBeVisible()
  const context = await browser.newContext()
  const fresh = await context.newPage()
  await fresh.goto(new URL('/entrar', projectUrl).href)
  await fresh.getByTestId('auth-email').fill(email)
  await fresh.getByTestId('auth-password').fill(password)
  await fresh.getByTestId('auth-submit').click()
  await expect(fresh).toHaveURL(/\/projetos$/)
  await fresh.goto(projectUrl)
  await expect(fresh.getByTestId('save-status')).toHaveText('Salvo')
  await expect(fresh.getByTestId('base-plan')).toBeVisible()
  const restored = await fresh.evaluate(() => window.__editor.getState().project)
  expect(restored.name).toBe('Piloto de validação')
  expect(restored.environments[1].items).toHaveLength(2)
  expect(restored.environments[1].perspectives).toHaveLength(1)
  await fresh.getByTestId('stage-pranchas').click()
  await fresh.locator('[data-testid^="sheet-perspective-"]').click()
  await expect(fresh.getByTestId('sheet-preview').locator('image')).toHaveAttribute(
    'href',
    /^data:image/,
  )
  await fresh.screenshot({ path: test.info().outputPath('04-restaurado.png') })
  writeFileSync(
    test.info().outputPath('pilot.json'),
    JSON.stringify({ projectUrl, email, project: restored }, null, 2),
  )
  await context.close()
})

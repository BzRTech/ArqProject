import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/** Fase 6: Minha marca, folha por ambiente, PDF de uma prancha e memorial. Precisa do backend. */
const shot = (name: string) => `test-results/screenshots/${name}.png`

async function signUp(page: Page) {
  await page.goto('/entrar')
  await page.getByTestId('auth-mode-Criar conta').click()
  await page.getByTestId('auth-name').fill('Clara Prancha')
  await page
    .getByTestId('auth-email')
    .fill(`prancha-${Date.now()}-${Math.random()}@prancheta.local`)
  await page.getByTestId('auth-password').fill('senha-boa-e2e-9')
  await page.getByTestId('auth-org').fill('Estúdio Clara')
  await page.getByTestId('auth-submit').click()
  await expect(page).toHaveURL(/\/projetos$/)
}

/** Texto e tamanho do PDF (poppler). */
function pdfInfo(path: string) {
  const text = execFileSync('pdftotext', ['-layout', path, '-']).toString()
  const info = execFileSync('pdfinfo', [path]).toString()
  return { text, info }
}

test('minha marca no carimbo, prancha A4 retrato só dela e memorial em PDF', async ({ page }) => {
  await signUp(page)

  // Minha marca: contatos e logo
  await page.getByTestId('brand-link').click()
  await expect(page).toHaveURL(/\/escritorio$/)
  await page.getByTestId('brand-phone').fill('(11) 98888-7777')
  await page.getByTestId('brand-registration').fill('CAU A12345-6')
  await page.getByTestId('brand-save').click()
  await expect(page.getByTestId('brand-save')).toHaveText('Salvo')
  await page.getByTestId('brand-logo-input').setInputFiles('e2e/fixtures/planta-teste.png')
  await expect(page.getByTestId('brand-logo')).toBeVisible()
  await expect(page.getByTestId('brand-preview')).toContainText('CAU A12345-6')
  await page.screenshot({ path: shot('fase6-01-minha-marca') })

  // Projeto com uma sala e um sofá com preço
  await page.goto('/projetos')
  await page.getByTestId('new-project').click()
  await page.getByTestId('new-project-name').fill('Apartamento Jardins')
  await page.getByTestId('new-project-client').fill('Família Lima')
  await page.getByTestId('new-project-submit').click()
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')
  await page.evaluate(() => {
    type S = {
      addRoom(c: { x: number; y: number }): string
      addItem(b: string, p: { x: number; y: number }): string
      updateItem(id: string, patch: Record<string, unknown>): void
    }
    const s = (window as unknown as { __editor: { getState(): S } }).__editor.getState()
    s.addRoom({ x: 0, y: 0 })
    const id = s.addItem('sofa', { x: 1500, y: 1500 })
    s.updateItem(id, { unitPriceCents: 459900, supplier: 'Loja X' })
  })
  await expect(page.getByTestId('save-status')).toHaveText('Salvo')

  // Pranchas: carimbo com a marca; folha A4 retrato só neste ambiente
  await page.getByTestId('stage-pranchas').click()
  await expect(page.getByTestId('sheet-preview')).toContainText('CAU A12345-6')
  await expect(page.getByTestId('sheet-preview')).toContainText('Estúdio Clara')
  await page.getByTestId('sheet-paper').selectOption('A4|portrait')
  await expect(page.getByTestId('pranchas-panel')).toContainText('A4 retrato')
  await expect(page.getByTestId('sheet-preview')).toContainText('FOLHA A4')
  await page.screenshot({ path: shot('fase6-02-prancha-a4') })

  const download = page.waitForEvent('download')
  await page.getByTestId('sheet-pdf-one').click()
  const file = await download
  expect(file.suggestedFilename()).toBe('apartamento-jardins-prancha.pdf')
  const path = await file.path()
  const { text, info } = pdfInfo(path)
  expect(info).toMatch(/Pages:\s+1/)
  expect(info).toMatch(/Page size:\s+595\.\d+ x 841\.\d+ pts/) // A4 em pé
  expect(text).toContain('CAU A12345-6')
  expect(text).toContain('Sofá')
  expect(readFileSync(path).includes('/Subtype /Image')).toBe(true) // logo embutido

  // Memorial (servidor): usa o relatório que o editor enviou no save
  const res = await page.request.get(
    page.url().replace('/projetos/', '/api/projects/') + '/memorial.pdf',
  )
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('application/pdf')
  const memo = test.info().outputPath('memorial.pdf')
  ;(await import('node:fs')).writeFileSync(memo, await res.body())
  const m = pdfInfo(memo)
  for (const t of [
    'Apartamento Jardins',
    'Família Lima',
    'Sofá',
    'Loja X',
    'R$ 4.599,00',
    'CAU A12345-6',
  ])
    expect(m.text).toContain(t)
  execFileSync('pdftoppm', [
    '-png',
    '-r',
    '70',
    '-f',
    '1',
    '-l',
    '1',
    memo,
    shot('fase6-03-memorial').replace('.png', ''),
  ])

  // Botão do memorial no editor e no cartão do projeto
  await expect(page.getByTestId('memorial-pdf')).toBeVisible()
  await page.goto('/projetos')
  await expect(page.getByTestId('project-memorial')).toHaveAttribute('href', /\/memorial\.pdf$/)
})

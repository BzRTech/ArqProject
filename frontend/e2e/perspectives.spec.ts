import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('captura 3D persiste nas pranchas, renomeia, exporta e permite desfazer exclusão', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const panel = async (name: 'catalog' | 'properties') => {
    const button = page.getByTestId(`tablet-${name}`)
    if ((await button.isVisible()) && (await button.getAttribute('aria-expanded')) !== 'true')
      await button.click()
  }
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.getByTestId('stage-layout').click()
  await panel('catalog')
  await page.getByTestId('block-cama-casal').click()
  const box = (await page.getByTestId('plan-canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.getByTestId('stage-3d').click()
  await page.getByLabel('Vista 3D').selectOption({ label: 'Cama de casal' })
  const save = page.getByRole('button', { name: 'Salvar perspectiva nas pranchas' })
  await expect(save).toBeEnabled()
  await page.waitForTimeout(1200)
  await save.click()
  const row = page.locator('[data-testid^="sheet-perspective-"]')
  await expect(row).toHaveCount(1)
  await expect(page.getByTestId('sheet-preview').locator('image')).toHaveCount(1)
  await panel('properties')
  await page.getByLabel('Título da perspectiva').fill('Quarto · vista principal')
  await page.getByLabel('Título da perspectiva').press('Tab')
  await expect(row).toContainText('Quarto · vista principal')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.reload()
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.getByTestId('stage-pranchas').click()
  await panel('catalog')
  await row.click()
  await panel('properties')
  await expect(page.getByLabel('Título da perspectiva')).toHaveValue('Quarto · vista principal')
  await expect(page.getByTestId('sheet-preview').locator('image')).toHaveAttribute(
    'href',
    /^data:image/,
  )
  await page.getByTestId('sheet-paper').selectOption('A4|portrait')
  await page.screenshot({ path: 'test-results/screenshots/perspectiva-prancha.png' })
  for (const [button, pages] of [
    ['sheet-pdf-one', 1],
    ['sheet-pdf', 2],
  ] as const) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId(button).click(),
    ])
    const path = `test-results/${button}-perspectivas.pdf`
    await download.saveAs(path)
    const pdf = (await readFile(path)).toString('latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf.match(/\/Type \/Page\b/g)).toHaveLength(pages)
    expect(pdf).toContain('/Subtype /Image')
    // A4 retrato: 210 × 297 mm convertidos em pontos do PDF.
    const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf)!
    expect((Number(box[1]) * 25.4) / 72).toBeCloseTo(210)
    expect((Number(box[2]) * 25.4) / 72).toBeCloseTo(297)
  }
  await page.getByRole('button', { name: 'Excluir perspectiva' }).click()
  await expect(row).toHaveCount(0)
  await page.getByTestId('sheet-undo').click()
  await expect(row).toHaveCount(1)
  expect(errors).toEqual([])
})

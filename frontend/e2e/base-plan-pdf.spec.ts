import { expect, test } from '@playwright/test'
import { jsPDF } from 'jspdf'

test('escolhe a página do PDF, importa, remove e desfaz a remoção da planta', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const pdf = new jsPDF({ format: 'a4' })
  pdf.text('PLANTA - PAGINA 1', 20, 30)
  pdf.rect(30, 60, 100, 160)
  pdf.addPage('a3', 'landscape')
  pdf.text('PLANTA - PAGINA 2', 20, 30)
  pdf.rect(40, 60, 300, 170)
  const file = {
    name: 'planta.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf.output('arraybuffer')),
  }
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.getByTestId('base-plan-input').setInputFiles(file)
  await expect(page.getByTestId('pdf-plan-dialog')).toBeVisible()
  await expect(page.getByTestId('pdf-plan-page')).toHaveAttribute('max', '2')
  await page.getByTestId('pdf-plan-page').fill('2')
  const preview = page.getByTestId('pdf-plan-preview')
  await expect(preview).toHaveAttribute('alt', 'Prévia da página 2')
  expect(
    await preview.evaluate(
      (img) => (img as HTMLImageElement).naturalWidth > (img as HTMLImageElement).naturalHeight,
    ),
  ).toBe(true)
  await page.screenshot({ path: 'test-results/screenshots/46-importar-pdf.png' })
  await page.getByTestId('pdf-plan-import').click()
  await expect(page.getByTestId('pdf-plan-dialog')).not.toBeVisible()
  await expect(page.getByTestId('base-plan')).toBeVisible()
  await expect(page.getByTestId('base-plan')).toHaveAttribute('href', /^data:image\/png/)
  await page.getByTestId('remove-base-plan').click()
  await expect(page.getByTestId('base-plan')).toHaveCount(0)
  await page.getByTestId('undo').click()
  await expect(page.getByTestId('base-plan')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('base-plan')).toBeVisible()
  await page.getByTestId('base-plan-input').setInputFiles(file)
  await expect(page.getByTestId('pdf-plan-dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByTestId('base-plan')).toBeVisible()
  expect(errors).toEqual([])
})

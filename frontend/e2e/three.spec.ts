import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
type FixtureState = {
  addWall: (points: { x: number; y: number }[], closed: boolean) => string
  addAreasFromWalls: () => void
  addItem: (id: string, point: { x: number; y: number }) => string
  openDetail: (id: string) => void
  updateItem: (id: string, patch: unknown) => void
  project: { environments: { items: { id: string; joinery?: Record<string, unknown> }[] }[] }
}

test('cama reconhecível no 3D a partir de um item do catálogo', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.getByTestId('stage-layout').click()
  await page.getByTestId('block-cama-casal').click()
  const plan = page.getByTestId('plan-canvas')
  const bounds = (await plan.boundingBox())!
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.getByTestId('stage-3d').click()
  await page.getByLabel('Vista 3D').selectOption({ label: 'Cama de casal' })
  await expect(page.getByRole('button', { name: 'Capturar PNG' })).toBeEnabled()
  await expect(page.getByTestId('scene-canvas').locator('canvas')).toBeVisible()
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-results/screenshots/45-3d-cama.png' })
  expect(errors).toEqual([])
})

test('3D do ambiente e móvel, aberto/fechado, PNG e prancha de perspectiva', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  // Fixture through the same store commands used by the editor controls.
  await page.evaluate(() => {
    const useEditor = (window as unknown as { __editor: { getState: () => FixtureState } }).__editor
    const s = useEditor.getState()
    s.addWall(
      [
        { x: 0, y: 0 },
        { x: 4000, y: 0 },
        { x: 4000, y: 3500 },
        { x: 0, y: 3500 },
      ],
      true,
    )
    s.addAreasFromWalls()
    const id = useEditor.getState().addItem('rack', { x: 2000, y: 400 })
    useEditor.getState().openDetail(id)
    const item = useEditor.getState().project.environments[0]!.items.find((it) => it.id === id)!
    const wood = {
      materialId: 'freijo',
      name: 'Freijó',
      kind: 'madeirado' as const,
      hex: '#b88a5a',
    }
    useEditor.getState().updateItem(id, {
      joinery: {
        ...item.joinery!,
        grain: 'vertical',
        finishes: {
          frentes: wood,
          tamponamento: wood,
          corpo: { materialId: 'branco', name: 'Branco', kind: 'liso', hex: '#efebe3' },
        },
      },
    })
  })
  await page.getByTestId('stage-3d').click()
  await expect(page.getByRole('button', { name: 'Capturar PNG' })).toBeEnabled()
  await expect(page.getByTestId('scene-canvas').locator('canvas')).toBeVisible()
  await page.getByLabel('Paredes e pilares').uncheck()
  await page.screenshot({ path: 'test-results/screenshots/43-3d-ambiente.png' })
  await page.getByLabel('Vista 3D').selectOption({ label: 'Rack / painel de TV' })
  await page.getByLabel('Abrir portas e gavetas').check()
  await page.getByRole('button', { name: 'Enquadrar 3D' }).click()
  await expect(page.getByTestId('scene-canvas').locator('canvas')).toBeVisible()
  // Wait for the remounted WebGL renderer to present its frame.
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'test-results/screenshots/44-3d-rack-aberto.png' })
  const [png] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Capturar PNG' }).click(),
  ])
  await png.saveAs('test-results/perspectiva.png')
  expect((await readFile('test-results/perspectiva.png')).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  )
  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Prancha de perspectiva (PDF)' }).click(),
  ])
  await pdf.saveAs('test-results/perspectiva.pdf')
  expect((await readFile('test-results/perspectiva.pdf')).subarray(0, 5).toString()).toBe('%PDF-')
  await page.getByLabel('Abrir portas e gavetas').uncheck()
  await page.getByTestId('stage-planta').click()
  await expect(page.getByTestId('plan-canvas')).toBeVisible()
  expect(errors).toEqual([])
})

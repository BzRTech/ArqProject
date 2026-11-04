import { expect, test } from '@playwright/test'
type FixtureState = {
  addItem: (id: string, point: { x: number; y: number }) => string
  project: { environments: { items: { id: string }[] }[] }
}

test('edita por toque e abre os painéis recolhíveis no iPad', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  await page.getByTestId('stage-layout').tap()
  await page.getByTestId('tablet-catalog').tap()
  await page.getByTestId('block-sofa').tap()
  await expect(page.getByTestId('tablet-catalog')).toHaveAttribute('aria-expanded', 'false')
  const canvas = page.getByTestId('plan-canvas')
  const box = (await canvas.boundingBox())!
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2
  await page.touchscreen.tap(x, y)
  await page.getByTestId('tablet-properties').tap()
  await expect(page.getByTestId('item-props')).toBeVisible()
  await page
    .getByRole('button', { name: 'Fechar painel', exact: true })
    .tap({ position: { x: 20, y: 20 } })
  await page.getByTestId('stage-planta').tap()
  await page.getByTestId('tool-wall').tap()
  await page.touchscreen.tap(x - 60, y)
  await page.touchscreen.tap(x + 60, y)
  await page.getByRole('button', { name: 'Concluir parede' }).tap()
  await expect(page.getByTestId('walls-layer')).toHaveAttribute('data-count', '1')
  await page.getByRole('button', { name: 'Cancelar ferramenta' }).tap()
  await page.screenshot({ path: 'test-results/screenshots/ipad-safari-planta.png' })
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByTestId('tablet-properties').tap()
  await expect(page.getByTestId('properties')).toBeVisible()
  await page.screenshot({ path: 'test-results/screenshots/ipad-safari-painel.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('catálogo completo no 3D e enquadramento da interface no iPad', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/editor')
  await expect(page.getByTestId('save-status')).toContainText('Salvo')
  const blockIds: string[] = []
  for (const stage of ['layout', 'marcenaria']) {
    await page.getByTestId(`stage-${stage}`).click()
    blockIds.push(
      ...(await page
        .getByTestId(/^block-/)
        .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-testid')!.slice(6)))),
    )
  }
  const ids: string[] = await page.evaluate((blockIds) => {
    const editor = (window as unknown as { __editor: { getState: () => FixtureState } }).__editor
    for (const id of blockIds) editor.getState().addItem(id, { x: 0, y: 0 })
    return editor.getState().project.environments[0]!.items.map((it) => it.id)
  }, blockIds)
  await page.getByTestId('stage-3d').click()
  const view = page.getByLabel('Vista 3D')
  await expect(view.locator('option')).toHaveCount(ids.length + 1)
  for (const id of ids) {
    await view.selectOption(id)
    await expect(page.getByTestId('scene-canvas').locator('canvas')).toBeVisible()
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
  }
  for (const name of [
    'Sofá',
    'Mesa redonda',
    'Cadeira de escritório',
    'Armário de cozinha',
    'Máquina de lavar',
    'Box com chuveiro',
  ]) {
    await view.selectOption({ label: name })
    await page.waitForTimeout(600)
    await page.screenshot({
      path: `test-results/screenshots/ipad-${name.replaceAll(' ', '-')}.png`,
    })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.setViewportSize({ width: 768, height: 1024 })
  await view.selectOption({ label: 'Sofá' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'test-results/screenshots/ipad-retrato.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

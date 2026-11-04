import { expect, test } from '@playwright/test'
type FixtureState = {
  addItem: (id: string, point: { x: number; y: number }) => string
  project: { environments: { items: { id: string }[] }[] }
}

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

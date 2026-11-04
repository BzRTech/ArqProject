import { expect, test, type CDPSession, type Locator } from '@playwright/test'

test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true })
type Touch = { x: number; y: number; id: number }
const touch = (
  session: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
  points: Touch[],
) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points })
const viewOf = async (canvas: Locator) =>
  (await canvas.getAttribute('data-view'))!.split(' ').map(Number)
type EditorState = {
  project: {
    environments: {
      items: { id: string; position: { x: number; y: number } }[]
      drawings: unknown[]
    }[]
  }
}

test('toque, arrasto, pinça e dois dedos navegam sem alterar o projeto por acidente', async ({
  page,
}) => {
  test.setTimeout(90_000)
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
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  await page.touchscreen.tap(center.x, center.y)
  const project = () =>
    page.evaluate(
      () =>
        (window as unknown as { __editor: { getState: () => EditorState } }).__editor.getState()
          .project,
    )
  await expect.poll(async () => (await project()).environments[0]!.items.length).toBe(1)
  const original = await project()
  const before = await viewOf(canvas)
  const cdp = await page.context().newCDPSession(page)
  const first = { x: center.x - 70, y: center.y, id: 1 }
  const second = { x: center.x + 70, y: center.y, id: 2 }
  await touch(cdp, 'touchStart', [first])
  await touch(cdp, 'touchStart', [first, second])
  await touch(cdp, 'touchMove', [
    { x: center.x - 90, y: center.y + 15, id: 1 },
    { x: center.x + 130, y: center.y + 15, id: 2 },
  ])
  await touch(cdp, 'touchEnd', [])
  const zoomed = await viewOf(canvas)
  expect(zoomed[0]).toBeCloseTo((before[0]! * 220) / 140, 3)
  const anchorX = (center.x - box.x - before[1]!) / before[0]!
  const anchorY = (center.y - box.y - before[2]!) / before[0]!
  expect(anchorX * zoomed[0]! + zoomed[1]!).toBeCloseTo(center.x - box.x + 20, 0)
  expect(anchorY * zoomed[0]! + zoomed[2]!).toBeCloseTo(center.y - box.y + 15, 0)
  expect(await project()).toEqual(original)
  // Pick the same item using its updated screen position.
  const item = original.environments[0]!.items[0]!
  const at = {
    x: box.x + (item.position.x + 500) * zoomed[0]! + zoomed[1]!,
    y: box.y + item.position.y * zoomed[0]! + zoomed[2]!,
  }
  await touch(cdp, 'touchStart', [{ ...at, id: 3 }])
  await touch(cdp, 'touchMove', [{ x: at.x + 40, y: at.y + 10, id: 3 }])
  await touch(cdp, 'touchMove', [{ x: at.x + 80, y: at.y + 20, id: 3 }])
  await touch(cdp, 'touchEnd', [])
  expect((await project()).environments[0]!.items[0]!.position).not.toEqual(item.position)
  await page.getByTestId('undo').tap()
  expect(await project()).toEqual(original)
  // Adding a second finger during a drag restores the item and starts navigation.
  await touch(cdp, 'touchStart', [{ ...at, id: 4 }])
  await touch(cdp, 'touchMove', [{ x: at.x + 40, y: at.y, id: 4 }])
  await touch(cdp, 'touchStart', [
    { x: at.x + 40, y: at.y, id: 4 },
    { x: at.x + 100, y: at.y, id: 5 },
  ])
  await touch(cdp, 'touchMove', [
    { x: at.x + 30, y: at.y + 10, id: 4 },
    { x: at.x + 120, y: at.y + 10, id: 5 },
  ])
  await touch(cdp, 'touchEnd', [])
  expect(await project()).toEqual(original)
  await page.getByTestId('stage-planta').tap()
  await page.getByTestId('tool-wall').tap()
  // Pinching in a drawing tool must not create its first point.
  await touch(cdp, 'touchStart', [first])
  await touch(cdp, 'touchStart', [first, second])
  await touch(cdp, 'touchMove', [
    { ...first, x: first.x - 15 },
    { ...second, x: second.x + 15 },
  ])
  await touch(cdp, 'touchEnd', [])
  expect(await project()).toEqual(original)
  await page.touchscreen.tap(center.x - 70, center.y)
  await page.touchscreen.tap(center.x + 70, center.y)
  await page.getByRole('button', { name: 'Concluir parede' }).tap()
  expect((await project()).environments[0]!.drawings).toHaveLength(1)
  await page.getByRole('button', { name: 'Cancelar ferramenta' }).tap()
  await page.screenshot({ path: 'test-results/screenshots/ipad-planta-gestos.png' })
  await page.getByTestId('stage-pranchas').tap()
  const sheet = page.getByTestId('sheet-canvas')
  const sheetBefore = await viewOf(sheet)
  const sheetBox = (await sheet.boundingBox())!
  const sx = sheetBox.x + sheetBox.width / 2,
    sy = sheetBox.y + sheetBox.height / 2
  await touch(cdp, 'touchStart', [{ x: sx - 50, y: sy, id: 6 }])
  await touch(cdp, 'touchStart', [
    { x: sx - 50, y: sy, id: 6 },
    { x: sx + 50, y: sy, id: 7 },
  ])
  await touch(cdp, 'touchMove', [
    { x: sx - 90, y: sy + 20, id: 6 },
    { x: sx + 90, y: sy + 20, id: 7 },
  ])
  await touch(cdp, 'touchEnd', [])
  expect((await viewOf(sheet))[0]).toBeGreaterThan(sheetBefore[0]!)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByTestId('tablet-properties').tap()
  await expect(page.getByTestId('properties')).toBeVisible()
  await page.screenshot({ path: 'test-results/screenshots/ipad-painel-retrato.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

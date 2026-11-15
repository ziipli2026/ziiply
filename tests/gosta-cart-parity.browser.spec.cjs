const { test, expect, devices } = require('@playwright/test');
const base = process.env.ZIIPLY_PREVIEW_URL || 'http://127.0.0.1:3000';
// This is intentionally synthetic test data, not an assertion about a live offer.
const sample = {
  id: 'gosta-watch-ean-6438574526741',
  ean: '6438574526741',
  name: 'Kirjolohiannospakkaus',
  title: 'Kirjolohiannospakkaus',
  quantity: 1,
  source: 'offer',
  storeName: 'K-Citymarket',
  price: 6.99,
  discountText: 'Tarjous 6,99 €',
  validFrom: '2026-11-15',
  validUntil: '2026-11-19',
  validityText: 'Voimassa 15.11.–19.11.',
};
test('mobile: restored cart displays offer discount and validity', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => console.log('[browser-error]', String(error)));
  // A clean first visit initializes Ziiply's CacheStorage marker, which would
  // otherwise erase a synthetic saved store selection during boot.
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(item => {
    localStorage.setItem('ziiply-cart-v1', JSON.stringify({ version: 2, savedAt: Date.now(), items: [item] }));
    localStorage.setItem('ziiply-store-selection-v536', JSON.stringify({
      version: 1, savedAt: Date.now(), storeMode: 'local',
      storeModeChosenV299: true, storeCompareScope: 'between_chains',
      betweenChainSelectionModeV749: 'one',
      selectedChains: { s: false, k: true, lidl: false, tokmanni: false },
    }));
    sessionStorage.setItem('ziiply-active-panel-v812', 'cart');
  }, sample);
  const response = await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('[page]', JSON.stringify({ status: response?.status(), url: page.url() }));
  await expect(page.locator('body')).toBeVisible();
  const cart = page.getByRole('button', { name: /^Kori(?:\s|$)/ }).first();
  try {
    await expect(cart, 'Kori control must be visible in mobile navigation').toBeVisible({ timeout: 30000 });
  } catch (error) {
    console.log('[missing-cart-button]', JSON.stringify({
      url: page.url(), title: await page.title(),
      body: (await page.locator('body').innerText()).slice(0, 3000),
      buttons: await page.getByRole('button').allTextContents(),
    }));
    await page.screenshot({ path: 'test-results/mobile-navigation-failure.png', fullPage: true });
    throw error;
  }
  const continueButton = page.getByRole('button', { name: 'Jatka', exact: true });
  if (await continueButton.isVisible()) await continueButton.click();
  console.log('[cart-navigation]', JSON.stringify({
    disabled: await cart.isDisabled(),
    savedSelection: await page.evaluate(() => localStorage.getItem('ziiply-store-selection-v536')),
    savedCart: await page.evaluate(() => localStorage.getItem('ziiply-cart-v1')),
  }));
  await expect(cart).toBeEnabled({ timeout: 12000 });
  const visibleRow = page.locator('article:visible').filter({ hasText: 'Kirjolohiannospakkaus' }).first();
  if (!(await visibleRow.isVisible())) await cart.click();
  await expect(visibleRow, 'The actual visible mobile cart row should render').toBeVisible({ timeout: 15000 });
  await expect(visibleRow.getByText('Tarjous 6,99 €')).toBeVisible();
  await expect(visibleRow.getByText('Voimassa 15.11.–19.11.')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-cart.png', fullPage: true });
  await context.close();
});
test('desktop preview: actual app UI renders', async ({ page }) => {
  const response = await page.goto(base + '/desktop-preview', { waitUntil: 'domcontentloaded', timeout: 60000 });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Authentication Required|Application error|404: NOT_FOUND/);
  console.log('[desktop]', JSON.stringify({ status: response?.status(), title: await page.title() }));
});

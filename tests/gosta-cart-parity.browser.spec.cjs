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
  // Cart restoration happens asynchronously after hydration; do not probe isVisible()
  // before the restore dialog has appeared.
  await expect(continueButton, 'Restored cart confirmation should appear').toBeVisible({ timeout: 15000 });
  await continueButton.click();
  await expect(continueButton).toBeHidden({ timeout: 12000 });
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

test('mobile: mocked offer-watch response preserves campaign metadata through add and repeat add', async ({ browser }) => {
  test.setTimeout(90000);
  const context = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  const page = await context.newPage();
  const mockOffer = {
    title: 'Kirjolohiannospakkaus',
    name: 'Kirjolohiannospakkaus',
    price: '6.99',
    offerPrice: '6.99',
    discountText: 'Tarjous 6,99 €',
    validFrom: '2026-11-15',
    validUntil: '2026-11-19',
    storeName: 'K-Citymarket Hyvinkää',
    chain: 'K',
    source: 'K',
    ean: '6438574526741',
    watchQueries: ['kirjolohi'],
  };
  let watchRequests = 0;
  await page.route('**/api/offers/watch?**', async route => {
    watchRequests++;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, partial: false, results: [mockOffer],
    }) });
  });
  page.on('pageerror', error => console.log('[watch-browser-error]', String(error)));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    localStorage.setItem('ziiply-gosta-offer-watches-v1', JSON.stringify(['kirjolohi']));
    localStorage.setItem('ziiply-store-selection-v536', JSON.stringify({
      version: 1, savedAt: Date.now(), storeMode: 'local',
      storeModeChosenV299: true, storeCompareScope: 'between_chains',
      betweenChainSelectionModeV749: 'one',
      selectedChains: { s: false, k: true, lidl: false, tokmanni: false },
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Gösta: Tarjousvahti' })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Gösta: Tarjousvahti' }).click();
  const offerRow = page.locator('article:visible').filter({ hasText: 'Kirjolohiannospakkaus' }).first();
  try {
    await expect(offerRow, 'Mocked Gösta watch offer should appear').toBeVisible({ timeout: 30000 });
    await offerRow.getByRole('button', { name: 'Lisää ostoskoriin' }).click();
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('ziiply-cart-v1') || 'null');
      return saved?.items?.length === 1 && saved.items[0].discountText === 'Tarjous 6,99 €';
    }, null, { timeout: 15000 });
    await offerRow.getByRole('button', { name: 'Lisää ostoskoriin' }).click();
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('ziiply-cart-v1') || 'null');
      return saved?.items?.length === 1 && saved.items[0].quantity === 2;
    }, null, { timeout: 15000 });
    const { items } = await page.evaluate(() => JSON.parse(localStorage.getItem('ziiply-cart-v1') || '{}'));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      ean: '6438574526741', quantity: 2, discountText: 'Tarjous 6,99 €',
      validFrom: '2026-11-15', validUntil: '2026-11-19',
      validityText: 'Voimassa 15.–19.11.',
    });
    expect(watchRequests).toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/watch-offer-added.png', fullPage: true });
  } catch (error) {
    console.log('[watch-offer-debug]', JSON.stringify({
      url: page.url(), requests: watchRequests,
      offerSnapshot: await page.evaluate(() => localStorage.getItem('ziiply-gosta-watch-results-v1')),
      body: (await page.locator('body').innerText()).slice(0, 3500),
    }));
    await page.screenshot({ path: 'test-results/watch-offer-failure.png', fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
});

test('desktop preview: actual app UI renders', async ({ page }) => {
  const response = await page.goto(base + '/desktop-preview', { waitUntil: 'domcontentloaded', timeout: 60000 });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Authentication Required|Application error|404: NOT_FOUND/);
  console.log('[desktop]', JSON.stringify({ status: response?.status(), title: await page.title() }));
});

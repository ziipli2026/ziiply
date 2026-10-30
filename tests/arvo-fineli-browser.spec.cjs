const { test, expect } = require('@playwright/test');

test('Arvo manual EAN shows labeled Fineli estimate and scales by grams', async ({ page }) => {
  await page.route('**/api/ean-bank?ean=6410405228529', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ok:true,product:{ean:'6410405228529',name:'Pirkka gluteeniton makaroni 400g',
      nutrition:{source:'open-food-facts',salt_100g:null,estimatedSalt:{
        value:0.01055,unit:'g/100g',source:'fineli-generic',estimated:true,label:'Fineli – arvio',
        fineliId:29496,foodName:'MAKARONI, GLUTEENITON',confidence:'verified'}}}})
  }));
  await page.goto('http://127.0.0.1:3000/arvo-scanner-preview');
  await page.getByRole('button', { name: 'Syötä EAN' }).click();
  await page.getByRole('textbox', { name: 'EAN-koodi' }).fill('6410405228529');
  await page.getByRole('button', { name: 'Hae EAN' }).click();
  await expect(page.getByText('Pirkka gluteeniton makaroni 400g')).toBeVisible();
  await expect(page.getByText('Fineli – arvio')).toBeVisible();
  await expect(page.getByText(/0,0105 g/)).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Grammamäärä' }).fill('400');
  await expect(page.getByText(/0,0422 g/)).toBeVisible();
});
test('Arvo does not show estimate when declared salt is present', async ({ page }) => {
  await page.route('**/api/ean-bank?ean=6410405228529', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ok:true,product:{ean:'6410405228529',name:'Testituote',
      nutrition:{source:'open-food-facts',salt_100g:0.5,estimatedSalt:{
        value:0.01055,source:'fineli-generic',estimated:true}}}})
  }));
  await page.goto('http://127.0.0.1:3000/arvo-scanner-preview');
  await page.getByRole('button', { name: 'Syötä EAN' }).click();
  await page.getByRole('textbox', { name: 'EAN-koodi' }).fill('6410405228529');
  await page.getByRole('button', { name: 'Hae EAN' }).click();
  await expect(page.getByText(/0,5 g/)).toBeVisible();
  await expect(page.getByText('Fineli – arvio')).toHaveCount(0);
});

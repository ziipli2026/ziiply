const { test, expect, devices } = require('@playwright/test');
const base = process.env.ZIIPLY_PREVIEW_URL || 'https://ziiply-b2gt9m72n-ziipli2026s-projects.vercel.app';
const sample = {
 id:'gosta-watch-ean-6438574526741', ean:'6438574526741', name:'Kirjolohiannospakkaus',
 title:'Kirjolohiannospakkaus', quantity:1, source:'offer', storeName:'K-Citymarket',
 price:6.99, discountText:'Tarjous 6,99 €', validFrom:'2026-11-15',validUntil:'2026-11-19',
 validityText:'Voimassa 15.11.–19.11.'
};
test('mobile: cart campaign metadata survives browser storage and is rendered',async ({browser})=>{
 const context=await browser.newContext({...devices['iPhone 13'], serviceWorkers:'block'});
 await context.addInitScript(item=>localStorage.setItem('ziiply-cart-v1',JSON.stringify([item])),sample);
 const page=await context.newPage();
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.screenshot({path:'test-results/mobile-before-cart.png',fullPage:true});
 await expect(page.locator('body')).toBeVisible();
 const cart=page.getByRole('button',{name:/^Kori(?:\s|$)/}).first();
 await expect(cart,'Mobile Kori navigation must be available').toBeVisible({timeout:20000});
 await cart.click();
 await expect(page.getByText('Kirjolohiannospakkaus').first()).toBeVisible({timeout:15000});
 await expect(page.getByText('Tarjous 6,99 €').first()).toBeVisible();
 await expect(page.getByText('Voimassa 15.11.–19.11.').first()).toBeVisible();
 await page.screenshot({path:'test-results/mobile-cart.png',fullPage:true});
 await context.close();
});
test('desktop preview: application loads',async ({page})=>{
 await page.goto(base+'/desktop-preview',{waitUntil:'domcontentloaded',timeout:45000});
 await expect(page.locator('body')).toBeVisible();
 await expect(page.locator('body')).not.toContainText('Application error');
});

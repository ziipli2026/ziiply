#!/usr/bin/env node
// Preview-only Chromium journey discovery. No cart writes, account login, or real-user data.
const {chromium}=require('playwright');
const target=process.env.ZIIPLY_SMOKE_URL;
if(!target||!new URL(target).hostname.includes('test-posthog-beta-audit'))throw Error('Protected PostHog preview URL required');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({locale:'fi-FI',viewport:{width:390,height:844},
   extraHTTPHeaders:process.env.VERCEL_OIDC_TOKEN?{'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}:
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{}
  });
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,150)));
  const events=[];
  page.on('request',r=>{if(new URL(r.url()).pathname==='/api/analytics/search'&&r.method()==='POST'){
    try{const b=JSON.parse(r.postData()||'{}');events.push({event:b.event,kind:b.search_kind});}catch{}
  }});
  const url=new URL(target);url.searchParams.set('ziiply_test','1');
  const response=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(3500);
  const initial=await page.getByRole('button').allTextContents();
  const assistantButtons=await page.locator('button').evaluateAll(items=>items.filter(e=>/Gösta|Justiina/i.test((e.textContent||'')+' '+(e.getAttribute('aria-label')||''))).map(e=>({text:(e.textContent||'').trim().slice(0,60),aria:e.getAttribute('aria-label'),visible:!!e.getClientRects().length})).slice(0,10));
  const report={check:'beta-journey-navigation',status:response?.status(),buttons:initial.map(x=>x.trim().slice(0,55)).filter(Boolean).slice(0,22),assistantButtons,journeys:{},errors};
  for(const [name,button] of [['gosta',/Gösta/i],['justiina',/Justiina/i],['cart',/^Kori$/i],['comparison',/^Vertailu$/i]]){
   const control=page.getByRole('button',{name:button}).first();
   const visible=await control.isVisible().catch(()=>false);
   const enabled=visible&&await control.isEnabled().catch(()=>false);
   report.journeys[name]={visible,enabled};
   // Only inspect availability: clicking empty cart/comparison is not a completed action.
  }
  report.searchTelemetryEvents=events;
  console.log(JSON.stringify(report));
  if(response?.status()!==200||errors.length||!report.journeys.gosta.visible||!report.journeys.justiina.visible||!report.journeys.cart.visible||!report.journeys.comparison.visible)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error('Beta journey browser smoke failed:',e.message);process.exitCode=1});

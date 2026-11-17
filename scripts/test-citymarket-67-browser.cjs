const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const rows=JSON.parse(fs.readFileSync('artifacts/hyvinkaa-tjek-baseline-enriched.json','utf8')).offers;
const ts=require('typescript'),vm=require('node:vm');
const categorySource=fs.readFileSync('src/app/components/ziiply/offerSearch/tjekDepartmentCategory.ts','utf8');
const compiled=ts.transpileModule(categorySource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports={};vm.runInNewContext(compiled,{exports:moduleExports});
const allowed=moduleExports.filterTjekGroceryRows(rows);
assert.equal(rows.length,139);assert.equal(allowed.length,57);
const sample=allowed.find(r=>r.title&&r.price);
assert.ok(sample);
const now=new Date(),from=new Date(now.getTime()-86400000).toISOString().slice(0,10),until=new Date(now.getTime()+86400000).toISOString().slice(0,10);
const offers=allowed.map((r,i)=>({...r,id:r.offerId,ean:'',name:r.title,chain:'K',storeName:'K-Citymarket Hyvinkää',storeId:'fe95rtb',source:'tjek',offerPrice:r.price,price:r.price,watchQueries:['kahvi'],validFrom:from,validUntil:until}));
(async()=>{const browser=await chromium.launch();const results={};try{
for(const [label,opts] of [['mobile',devices['iPhone 13']],['desktop',{viewport:{width:1440,height:900}}]]){
const context=await browser.newContext(opts);await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:60.63,longitude:24.86});
await context.addInitScript(()=>{const store={id:'fe95rtb',name:'K-Citymarket Hyvinkää',chain:'K',latitude:60.63,longitude:24.86};localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:'K',betweenMode:'one',storeCompareScope:'between_chains',allStoreSelections:{hyper:{[store.id]:store},local:{}}}));localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({activeArea:{label:'Hyvinkää'},storeMode:'hyper',storeModeChosenV299:true,storeCompareScope:'between_chains',betweenChainSelectionModeV749:'one',selectedChains:{k:true}}));localStorage.setItem('ziiply-gosta-offer-watches-v1',JSON.stringify(['kahvi']));});
const page=await context.newPage();await page.route('**/api/offers/watch?*',route=>route.fulfill({json:{ok:true,partial:false,results:offers}}));
await page.goto('http://127.0.0.1:3101/');await page.getByRole('button',{name:/Avaa tarjousvahdin .* osumaa/}).waitFor({timeout:30000});
const countLabel=await page.getByRole('button',{name:/Avaa tarjousvahdin .* osumaa/}).innerText();
await page.getByRole('button',{name:/Avaa tarjousvahdin .* osumaa/}).click();
if(label==='desktop') {
  const storeTab=page.getByRole('button',{name:/Tavaratalot.*tarjousta/i});
  await storeTab.waitFor({timeout:15000});
  await storeTab.click();
}
const sampleText=page.getByText(sample.title,{exact:true}).first();
await sampleText.waitFor({timeout:15000});
const shown=await page.getByText(sample.title,{exact:true}).count();
assert.ok(shown>0,label+' did not render a real Tjek fixture offer: '+sample.title);
// Compare all unique source titles actually rendered by the two layouts.
const expectedTitles=[...new Set(offers.map(row=>String(row.title).trim()))];
const visibleTitles=[];
for(const title of expectedTitles){
  const matches=page.getByText(title,{exact:true}).filter({visible:true});
  if(await matches.count()) visibleTitles.push(title);
}
assert.equal(visibleTitles.length,expectedTitles.length,label+' omitted '+(expectedTitles.length-visibleTitles.length)+' source titles: '+expectedTitles.filter(title=>!visibleTitles.includes(title)).slice(0,12).join(' | '));
const orderedTitles=await page.evaluate(titles=>{
  const wanted=new Set(titles);
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const seen=new Set(),ordered=[];
  while(walker.nextNode()){
    const node=walker.currentNode;
    const title=(node.textContent||'').trim();
    if(!wanted.has(title)||seen.has(title))continue;
    const element=node.parentElement;
    if(!element||!element.getClientRects().length)continue;
    const style=getComputedStyle(element);
    if(style.display==='none'||style.visibility==='hidden')continue;
    seen.add(title);ordered.push(title);
  }
  return ordered;
},expectedTitles);
assert.equal(orderedTitles.length,expectedTitles.length,label+' visible DOM order misses source titles');
results[label]={countLabel,shownSample:sample.offerId,visibleTitles:visibleTitles.length,orderedTitles};
await context.close();
}
assert.equal(results.mobile.shownSample,results.desktop.shownSample);
assert.deepEqual(results.mobile.orderedTitles,results.desktop.orderedTitles,'mobile and desktop visible Tjek offer ordering differs');
console.log('CITYMARKET_GROCERY_BROWSER_FIXTURE',JSON.stringify({fixtureRows:139,eligible:allowed.length,results}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});try{
await Promise.all([false,true].flatMap(desktop=>['one','many','control'].map(async mode=>{
let ctx=await b.newContext(desktop?{viewport:{width:1440,height:1000}}:devices['iPhone 13']);
const tag=(desktop?'desktop':'mobiili')+' '+mode;
let p=await ctx.newPage(); const req=[];p.on('request',r=>req.push(r.url()));p.on('pageerror',e=>console.log(tag,'pageerror',e.message));
await p.addInitScript(({mode})=>{
 const s={id:'634976534',name:'Prisma Hyvinkää',chain:'S'},k={id:'C130',name:'K-Citymarket Hyvinkää',chain:'K'},l={id:'FI0218',name:'Lidl Hyvinkää',chain:'LIDL'};
 const many=mode!=='one',lidl=mode!=='control',betweenMode=many?'many':'one';
 const item={id:'milk',name:'Valio kevytmaito 1 l',ean:'6408430106443',quantity:1,price:1.79,chain:'S',source:'search',product:{id:'milk',name:'Valio kevytmaito 1 l',ean:'6408430106443',price:179}};
 localStorage.setItem('ziiply-cart-v1',JSON.stringify({items:[item],savedAt:Date.now()}));
 sessionStorage.setItem('ziiply-active-panel-v812','cart');
 sessionStorage.setItem('ziiply-desktop-current-cart-v1',JSON.stringify([item]));
 localStorage.setItem('ziiply-desktop-store-choices-v1',JSON.stringify({storeMode:'hyper',storeModeChosen:true,selectedChain:many?'S':'LIDL',betweenMode,storeCompareScope:'between_chains',allStoreSelections:{hyper:{...(many?{[s.id]:s,[k.id]:k}:{}),...(lidl?{[l.id]:l}:{})},local:{}}}));
 localStorage.setItem('ziiply-store-selection-v536',JSON.stringify({version:1,savedAt:Date.now(),activeArea:{label:'Hyvinkää',sStoreId:s.id,sStoreName:s.name,kStoreId:k.id,kStoreName:k.name},storeMode:'hyper',storeModeChosenV299:true,storeCompareScope:'between_chains',betweenChainSelectionModeV749:betweenMode,selectedChains:{s:many,k:many,lidl,tokmanni:false},selectedLidlStoreV750:lidl?l:null,usingOwnLocation:false}));
}, {mode});
await p.route('**/api/**',async r=>{await r.fulfill({json:{ok:true,products:[],results:[],items:[]}})});
try{
await p.goto('http://127.0.0.1:3179/',{timeout:90000,waitUntil:'domcontentloaded'});
await (desktop?p.locator('[data-desktop-layout]'):p.getByRole('region',{name:'Ziiplyn avustajat'})).waitFor({timeout:35000});
if (!desktop) await p.getByRole('button',{name:'Jatka',exact:true}).filter({visible:true}).first().click({timeout:20000});
let cmp=p.getByRole('button',{name:/^Halpuusvertailu$/}).filter({visible:true});
if(!await cmp.count()){let cart=p.getByRole('button',{name:/^Kori\s*\d*$/}).filter({visible:true});await cart.last().click({timeout:10000});}
cmp=p.getByRole('button',{name:/^Halpuusvertailu$/}).filter({visible:true});
await cmp.first().click({timeout:15000});
const note=p.getByText('Lidl ei ole mukana ostoskorin hintavertailussa, koska ajantasaisia normaalihintoja ei ole saatavilla julkisista lähteistä.',{exact:true});
if(lidlMode()) {await note.waitFor({timeout:20000});assert.equal(await note.count(),1);} else {await (desktop?p.getByText('Prisma Hyvinkää',{exact:true}):p.getByRole('button',{name:'Avaa Prisma Hyvinkää',exact:true})).filter({visible:true}).first().waitFor({timeout:20000});assert.equal(await note.count(),0);}
assert.equal(await p.getByRole('button',{name:/Avaa Lidl/}).count(),0);
if(mode==='one')assert.equal(req.filter(x=>x.includes('/api/lidl/products')).length,0);
console.log('PASS',tag);
}catch(e){console.log('FAIL',tag,e.message.slice(0,850),(await p.locator('body').innerText().catch(()=>'' )).slice(0,750));process.exitCode=1;}
function lidlMode(){return mode!=='control'}
await ctx.close();
})));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

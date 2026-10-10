const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/app/desktop-preview/page.tsx', 'utf8');
function extract(name, next) {
  const start = source.indexOf('  function '+name+'(');
  let end = source.indexOf('  function '+next+'(', start+1);
  if (end < 0) end = source.indexOf('  async function '+next+'(', start+1);
  assert.ok(start >= 0 && end > start, 'missing helper '+name);
  return source.slice(start,end);
}
const ctx = vm.createContext({});
const helpers = extract('desktopCheapestPack','desktopIsFilterCoffee') + extract('desktopIsFilterCoffee','desktopCheapestSearchQueries') + extract('desktopCheapestSearchQueries','desktopCheapestCompatible') + extract('desktopCheapestCompatible','desktopChangeCompareMatchMode');
vm.runInContext(ts.transpileModule(helpers, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
const compatible = (a,b) => vm.runInContext('desktopCheapestCompatible('+JSON.stringify(a)+','+JSON.stringify(b)+')',ctx);
test('same pack and different brands',()=>assert.equal(compatible('Juhla Mokka suodatinkahvi 500 g','Kulta Katriina suodatinkahvi 500 g'),true));
test('coffee type must remain filter',()=>assert.equal(compatible('Juhla Mokka suodatinkahvi 500 g','Bellarom papukahvi 500 g'),false));
test('decaf stays decaf',()=>assert.equal(compatible('Kofeiiniton suodatinkahvi 500 g','Suodatinkahvi 500 g'),false));
test('organic stays organic',()=>assert.equal(compatible('Luomu suodatinkahvi 500 g','Suodatinkahvi 500 g'),false));
test('lactose-free milk stays lactose-free',()=>assert.equal(compatible('Laktoositon maito 1 l','Maito 1 l'),false));
test('fat-free milk stays fat-free',()=>assert.equal(compatible('Rasvaton maito 1 l','Täysmaito 1 l'),false));
test('multipacks preserve quantity',()=>assert.equal(compatible('Jogurtti 4 x 125 g','Jogurtti 500 g'),true));
test('different pack sizes are rejected',()=>assert.equal(compatible('Suodatinkahvi 500 g','Suodatinkahvi 450 g'),false));
test('missing pack sizes are rejected',()=>assert.equal(compatible('Suodatinkahvi','Suodatinkahvi 500 g'),false));
test('price comparison is in cents and only strictly cheaper',()=>{
  const start=source.indexOf('      if(mode==="cheapest"){',source.indexOf('async function desktopChangeCompareMatchMode'));
  const end=source.indexOf('      return filtered.slice(0,20)',start);
  const body=source.slice(start,end);
  assert.match(body,/Math\.round\(currentPrice\*100\)/);
  assert.match(body,/Number\(cheapest\.price\)>=Math\.round\(currentPrice\*100\)/);
  assert.match(body,/!Number\.isFinite\(currentPrice\)\|\|currentPrice<=0/);
  assert.equal(249 >= Math.round(2.50*100),false);
  assert.equal(250 >= Math.round(2.50*100),true);
  assert.equal(251 >= Math.round(2.50*100),true);
});

test('cheapest mode executes selection only for a strictly cheaper valid candidate', async () => {
  const start = source.indexOf('  async function desktopChangeCompareMatchMode(');
  const end = source.indexOf('  async function desktopSelectCompareAlternative(', start);
  assert.ok(start >= 0 && end > start, 'missing cheapest mode implementation');
  const implementation = ts.transpileModule(source.slice(start,end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  async function scenario(currentPrice, offers) {
    const selected = [];
    const notices = [];
    const env = vm.createContext({
      desktopCompareResults: { shop: { store: { id: 'shop' } } },
      cartItems: [{ id: 'item', name: 'Laktoositon maito 1 l', quantity: 1 }],
      storeKind: () => 'sHyper',
      desktopFindCompareCandidates: async () => offers.map((price, index) => ({ id: 'p'+index, name: 'Laktoositon maito 1 l', price })),
      productGroupGate: () => true,
      flashCartNotice: message => notices.push(message),
      desktopSelectCompareAlternative: async (...args) => selected.push(args),
    });
    vm.runInContext(ts.transpileModule(helpers, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + implementation, env);
    await env.desktopChangeCompareMatchMode('shop', { id: 'item', price: currentPrice }, 'cheapest');
    return { selected, notices };
  }
  assert.equal((await scenario(2.50,[249])).selected.length,1,'cheaper price must swap');
  assert.equal((await scenario(2.50,[250])).selected.length,0,'equal price must not swap');
  assert.equal((await scenario(2.50,[251])).selected.length,0,'higher price must not swap');
  assert.equal((await scenario(null,[249])).selected.length,0,'unknown current price must not swap');
  assert.equal((await scenario(2.50,[0])).selected.length,0,'zero-price candidate must not swap');
  const mixed = await scenario(2.50,[0,249,199,NaN]);
  assert.equal(mixed.selected.length,1,'one valid cheaper candidate must swap');
  assert.equal(mixed.selected[0][2].price,199,'must select lowest valid price even with invalid prices');
});

test('selected alternative updates compare row price, quantity total and missing count', async () => {
  const start=source.indexOf('  async function desktopSelectCompareAlternative(');
  const end=source.indexOf('  const [cartNotice,',start);
  assert.ok(start>=0 && end>start,'missing selection implementation');
  let state={shop:{rows:[{cartItemId:'item',name:'Original',price:2.50,quantity:2},{cartItemId:'other',name:'Other',price:3,quantity:1}],total:8,missing:0}};
  const notices=[];
  const env=vm.createContext({
    desktopCompareResults:state,
    desktopComparisonEdited:{current:false},
    cartItems:[],
    selectedStores:{},
    desktopComparisonEditedKey:'test',
    window:{localStorage:{setItem(){}}},
    storeKind:()=> 'sHyper',
    resolvePriceWeightLabel:()=> '',
    setDesktopCompareResults: updater=>{state=updater(state);env.desktopCompareResults=state},
    flashCartNotice: message=>notices.push(message),
  });
  vm.runInContext(ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,env);
  await env.desktopSelectCompareAlternative('shop',{id:'item'},{name:'Cheaper',price:199});
  assert.equal(state.shop.rows[0].price,1.99);
  assert.equal(state.shop.rows[0].name,'Cheaper');
  assert.equal(state.shop.total,6.98,'2 x 1.99 + 3.00');
  assert.equal(state.shop.missing,0);
  assert.equal(env.desktopComparisonEdited.current,true);
  await env.desktopSelectCompareAlternative('shop',{id:'item'},{name:'Invalid',price:0});
  assert.equal(state.shop.total,6.98,'invalid price must not change total');
});

test('S-market local route accepts actual store names and never falls back to Prisma',()=>{
  const route=fs.readFileSync('src/app/api/s-products/route.ts','utf8');
  const match=route.match(/if \(!\/([^\n]+)\/i\.test\(storeName\)\)/);
  assert.ok(match,'S-market validation regex must be present');
  const re=new RegExp(match[1],'i');
  assert.equal(re.test('S-market Hyvinkää'),true);
  assert.equal(re.test('S-Market Jokela'),true);
  assert.equal(re.test('Prisma Hyvinkää'),false);
  const start=route.indexOf('if (storeType === "local")');
  const end=route.indexOf('const endpoint =',start);
  assert.ok(start>0&&end>start,'local S-market branch must precede Ruoanhinta lookup');
  const local=route.slice(start,end);
  assert.match(local,/fetchSKaupatNormalProductsV220\(search, storeName\)/);
  assert.doesNotMatch(local,/resolveSStoreId|292/);
});

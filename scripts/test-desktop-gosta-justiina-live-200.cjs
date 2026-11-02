// Real deployed offer and recipe-provider API calls, 100 distinct queries per surface.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const cli=promisify(execFile);
const {desktopSearchDecision}=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const {recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const queries=JSON.parse(fs.readFileSync('scripts/fixtures/generic-100-batch-2.json','utf8')).queries;
assert.equal(queries.length,100);
const base=process.env.PREVIEW_URL||'https://ziiply-git-preview-legacy-desktop-ui-ziipli2026s-projects.vercel.app';
const report={target:base,runAt:new Date().toISOString(),kind:'live provider API and shared qualification; not browser UI',gosta:[],justiina:[]};
const save=()=>{report.summary={};for(const mode of ['gosta','justiina'])report.summary[mode]={total:report[mode].length,failed:report[mode].filter(x=>x.errors.length).length,pricedMatches:report[mode].reduce((n,x)=>n+x.pricedMatches,0),empty:report[mode].filter(x=>!x.pricedMatches).length};fs.writeFileSync('desktop-gosta-justiina-live-200.json',JSON.stringify(report,null,2));};
process.on('exit',save);
async function get(path){const {stdout}=await cli('vercel',['curl',new URL(path,base).toString(),'--','-sS','-f'],{timeout:65000,maxBuffer:16*1024*1024,env:process.env});const data=JSON.parse(stdout);if(data.ok===false||data.error)throw Error(JSON.stringify(data.error||data).slice(0,200));return data;}
async function test(mode,query){const entry={query,returned:0,pricedMatches:0,filtered:0,errors:[],examples:[]};report[mode].push(entry);try{
const path=mode==='gosta'?'/api/offers/search?q='+encodeURIComponent(query)+'&storeMode=hyper&scope=selected&sStoreId=292&sStoreName='+encodeURIComponent('Prisma Hyvinkää')+'&kStoreId=3221&kStoreName='+encodeURIComponent('K-Citymarket Hyvinkää'):'/api/s-products?search='+encodeURIComponent(query)+'&store=292&storeName='+encodeURIComponent('Prisma Hyvinkää')+'&storeType=hyper';
const data=await get(path);
const items=mode==='gosta'?(Array.isArray(data.results)?data.results:null):(Array.isArray(data.products)?data.products:Array.isArray(data.items)?data.items:null);
if(!items)throw Error('API response missing expected product array');
entry.returned=items.length;
for(const p of items){const name=String(p.name||p.title||p.productName||'');const rawPrice=p.price??p.storeItems?.[0]?.price??p.offerPrice??p.discountPrice??p.priceText??p.displayPrice??null;const price=Number(String(rawPrice??'').replace(/[^\\d,.]/g,'').replace(',','.'));const qualified=desktopSearchDecision(query,{...p,name}).accepted;
const compatible=mode==='gosta'?true:recipeProductCompatible(query,{...p,name});
if(qualified&&compatible&&(mode==='gosta'||price>0))entry.pricedMatches++;
else entry.filtered++;
if(qualified&&compatible&&(mode==='gosta'||price>0)&&entry.examples.length<4)entry.examples.push({name,price,ean:p.ean||null});
}
}catch(e){entry.errors.push(String(e).slice(0,500));}
if(mode==='gosta'&&entry.returned===0)entry.errors.push('No offers returned from selected S and K stores');
console.log(mode,query,'returned',entry.returned,'priced',entry.pricedMatches,entry.errors.length?'FAIL '+entry.errors.join(';'):'OK');
}
(async()=>{if(!process.env.VERCEL_TOKEN)throw Error('VERCEL_TOKEN missing');for(const query of queries){await test('gosta',query);await test('justiina',query);}save();console.log(JSON.stringify(report.summary));if(report.summary.gosta.failed||report.summary.justiina.failed)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1});

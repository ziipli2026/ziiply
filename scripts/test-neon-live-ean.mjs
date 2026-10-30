import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base=(process.env.PREVIEW_URL||'https://ziiply-git-preview-legacy-desktop-ui-ziipli2026s-projects.vercel.app').replace(/\/$/,'');
if(!process.env.VERCEL_TOKEN)throw Error('Missing VERCEL_TOKEN');
function request(q){
 const url=new URL('/api/neon-first-search',base);url.searchParams.set('q',q);
 let raw;
 try { raw=execFileSync('vercel',['curl',url.toString(),'--','-sS','-f'],{encoding:'utf8',timeout:30000,env:process.env}); }
 catch(error){console.error('Neon live request failed for',q,':',error.message);throw error;}
 let result;
 try { result=JSON.parse(raw); }
 catch(error){console.error('Neon returned invalid JSON for',q,':',String(raw).slice(0,300));throw error;}
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.ok(Array.isArray(result.products),'products must be array');
 return result;
}
const unknown='99999999999999';
const observations=[];
process.on('exit',()=>{
 try{writeFileSync('neon-live-search-report.json',JSON.stringify({target:base,observations},null,2));}
 catch(error){console.error('Could not write Neon diagnostics:',error.message);}
});
function observe(query,response){observations.push({query,count:response.count,version:response.searchVersion,categoryExpansion:response.categoryExpansion,examples:response.products.slice(0,5).map(p=>({ean:p.ean,name:p.name,category:p.category,rank:p.rank}))});}
const missing=request(unknown);
observe(unknown,missing);
assert.equal(missing.count,0,'unknown EAN should have zero matches');
assert.equal(missing.products.length,0,'unknown EAN must not return fuzzy matches');
assert.equal(missing.categoryExpansion,'exact-ean');
console.log('Unknown EAN: exact lookup, zero matches');
const name=request('maito');
observe('maito',name);
assert.ok(name.count>0,'name search should return products');
assert.notEqual(name.categoryExpansion,'exact-ean');
console.log('Name search:',name.count,'products');
const candidate=name.products.find(p=>/^\d{8,14}$/.test(String(p.ean||'')));
assert.equal(name.searchVersion.startsWith('neon-category-aware-'),true);
if(!candidate)throw Error('No EAN in name-search sample');
const exact=request(String(candidate.ean));
observe(String(candidate.ean),exact);
assert.equal(exact.products.length,1,'known EAN should return one product');
assert.equal(String(exact.products[0].ean),String(candidate.ean));
assert.equal(exact.categoryExpansion,'exact-ean');
console.log('Known EAN:',candidate.ean,'matched exactly');
for(const query of ['juusto','jogurtti','jauheliha','peruna','makkara','laktoositon maito']){
 const response=request(query);
 observe(query,response);
 assert.equal(response.query,query,'response must identify the requested query');
 assert.equal(response.count,response.products.length,'count must match products length');
 assert.ok(response.count>0,query+' must return products');
 assert.ok(response.count<=100,query+' must respect the 100-result cap');
 assert.equal(response.readOnly,true,'Neon search must remain read-only');
 assert.notEqual(response.categoryExpansion,'exact-ean','word search must not use barcode path');
 for(const product of response.products){
  assert.ok(product.name,query+' returned a product without name');
  assert.ok(/^\d{8,14}$/.test(String(product.ean||'')),query+' returned invalid EAN');
 }
 console.log(query+': '+response.count+' valid products');
}


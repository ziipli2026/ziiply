// Read-only diagnostics: why exact-EAN Ruoanhinta checks yield no verified prices?
// Also probe S-kaupat's existing RemoteComplementaryProducts focusOnEan operation directly.
// Never invoke application routes that may observe/write products to Neon.
import fs from 'node:fs';
const base=process.env.SEARCH_BASE_URL;
if(base!=='http://127.0.0.1:3099')throw Error('Local experimental server required');
const queries=['maito','makkara','kahvi','peruna','laktoositon maito'];
const stores=[{name:'S-ruoanhinta',id:292},{name:'K-ruoanhinta',id:3221}];
const hash='9a0f8fccb697df461e462d3f4192076dd02de0646755e392a8e547ec60815dcb';
const sStoreId='708276035'; // Existing S EAN route default, not Ruoanhinta's 292.
const limit=3;
const sClientVersion='production-add4ac0e6ec7f03f2c5373a6ebfab2b63df73f68';
const filteredHash='85a4eed2f0a1e3269ac49b94276ca952922568369d85ddd5dcee34481e4c0f91';
const rows=[];
const keys=o=>o&&typeof o==='object'?Object.keys(o).sort():[];
const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
async function fetchJson(url){const response=await fetch(url,{headers:{accept:'application/graphql-response+json,application/json;q=0.9','content-type':'application/json','accept-language':'fi',origin:'https://www.s-kaupat.fi',referer:'https://www.s-kaupat.fi/','x-client-name':'skaupat-web','x-client-version':sClientVersion},signal:AbortSignal.timeout(9000)});const data=await response.json().catch(()=>null);return {status:response.status,data};}
function itemDiagnostics(data,ean){const items=Array.isArray(data?.items)?data.items:[];const sample=items[0]||{};const exact=items.filter(x=>String(x.ean||x.gtin||x.barcode||'')===String(ean));const pricePaths=['price','pricing.currentPrice','pricing.regularPrice','storeItem.price','storeItems.0.price'];const values=x=>({price:x?.price??null,pricingCurrent:x?.pricing?.currentPrice??null,pricingRegular:x?.pricing?.regularPrice??null,storeItem:x?.storeItem?.price??null,storeItemsFirst:x?.storeItems?.[0]?.price??null});return {itemCount:items.length,topKeys:keys(data),itemKeys:keys(sample),storeItemKeys:keys(sample.storeItems?.[0]),examplePriceFields:values(sample),exactCount:exact.length,exactPriceFields:exact.slice(0,2).map(values),verified:exact.some(x=>Object.values(values(x)).some(v=>num(v)!==null)),pricePaths};}
function filteredProbeUrl(query){const url=new URL('https://api.s-kaupat.fi/');url.searchParams.set('operationName','RemoteFilteredProducts');url.searchParams.set('variables',JSON.stringify({availabilityDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),facets:[{key:'brandName',order:'asc'},{key:'category'},{key:'labels'}],generatedSessionId:'ziiply-ean-readonly',fetchSponsoredContent:false,limit:48,queryString:query,storeId:sStoreId,useRandomId:false,marketingId:'ziiply-ean-readonly'}));url.searchParams.set('extensions',JSON.stringify({clientLibrary:{name:'@apollo/client',version:'4.3.1'},persistedQuery:{version:1,sha256Hash:filteredHash}}));return url.toString();}
function sProbeUrl(ean){const url=new URL('https://api.s-kaupat.fi/');url.searchParams.set('operationName','RemoteComplementaryProducts');url.searchParams.set('variables',JSON.stringify({storeId:sStoreId,eans:[],limit:12,focusOnEan:ean}));url.searchParams.set('extensions',JSON.stringify({persistedQuery:{version:1,sha256Hash:hash}}));return url.toString();}
for(const query of queries){
 const bank=await fetchJson(base+'/api/neon-first-search?q='+encodeURIComponent(query));
 if(!bank.data?.ok)throw Error('Neon unavailable '+query);
 const baseline=await Promise.all(stores.map(s=>fetchJson('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(query)+'&storeIds='+s.id+'&skip=0&take=80')));
 const known=new Set(baseline.flatMap(r=>(r.data?.items||[]).map(x=>String(x.ean||''))));
 const candidates=bank.data.products.filter(p=>/^\d{8,14}$/.test(String(p.ean||''))&&!known.has(String(p.ean))).slice(0,limit);
 // Positive controls: first EAN from baseline, to prove endpoint/price parser works.
 const control=baseline.map((r,i)=>({store:stores[i].name,ean:String((r.data?.items||[]).find(p=>/^\d{8,14}$/.test(String(p.ean||'')))?.ean||'')}));
 for(const sample of [...candidates.map(p=>({ean:String(p.ean),kind:'neon-only'})),...control.filter(c=>c.ean).map(c=>({ean:c.ean,kind:'positive-control'}))]){
  const probes=await Promise.all(stores.map(async s=>{try{const r=await fetchJson('https://api.ruoanhinta.fi/api/items?search='+sample.ean+'&storeIds='+s.id+'&skip=0&take=80');return {store:s.name,status:r.status,...itemDiagnostics(r.data,sample.ean)};}catch(e){return {store:s.name,error:String(e)};}}));
  const candidateName=bank.data.products.find(p=>String(p.ean)===sample.ean)?.name||'';
  const nameTerm=candidateName.split(/\\s+/).filter(w=>w.length>=4).slice(0,2).join(' ');
  const ruoanhintaNameProbe=await Promise.all(stores.map(async s=>{if(!nameTerm)return {store:s.name,skipped:true};try{const r=await fetchJson('https://api.ruoanhinta.fi/api/items?search='+encodeURIComponent(nameTerm)+'&storeIds='+s.id+'&skip=0&take=80');return {store:s.name,term:nameTerm,status:r.status,...itemDiagnostics(r.data,sample.ean)};}catch(e){return {store:s.name,error:String(e)};}}));
  let sFiltered;
  try{const r=await fetchJson(filteredProbeUrl(nameTerm||query));const items=r.data?.data?.store?.products?.productListItems||[];const exact=items.map(x=>x.product||x).filter(p=>String(p.ean||'')===sample.ean);sFiltered={status:r.status,graphqlErrors:(r.data?.errors||[]).map(e=>String(e.message||'').slice(0,140)),count:items.length,exactCount:exact.length,exactPrices:exact.slice(0,2).map(p=>({current:p.pricing?.currentPrice??null,regular:p.pricing?.regularPrice??null}))};}catch(e){sFiltered={error:String(e)};}
  let directS;
  try{const r=await fetchJson(sProbeUrl(sample.ean));const products=r.data?.data?.complementaryProducts;const exact=Array.isArray(products)?products.filter(p=>String(p.ean||p.id||'')===sample.ean):[];directS={status:r.status,graphqlErrors:(r.data?.errors||[]).map(e=>String(e.message||'').slice(0,140)),topKeys:keys(r.data),count:Array.isArray(products)?products.length:null,exactCount:exact.length,exactPrices:exact.slice(0,2).map(p=>({price:p.price??null,current:p.pricing?.currentPrice??null,storeItem:p.storeItem?.price??null})),verified:exact.some(p=>[p.price,p.pricing?.currentPrice,p.storeItem?.price].some(v=>num(v)!==null))};}catch(e){directS={error:String(e)};}
  rows.push({query,kind:sample.kind,ean:sample.ean,ruoanhinta:probes,ruoanhintaNameProbe,sKaupatFiltered:sFiltered,sKaupatDirect:directS});
 }
}
const summary={probes:rows.length,neonOnly:rows.filter(r=>r.kind==='neon-only').length,ruoanhintaExact:rows.filter(r=>r.ruoanhinta.some(x=>x.exactCount>0)).length,ruoanhintaVerified:rows.filter(r=>r.ruoanhinta.some(x=>x.verified)).length,sDirectExact:rows.filter(r=>r.sKaupatDirect.exactCount>0).length,sDirectVerified:rows.filter(r=>r.sKaupatDirect.verified).length,ruoanhintaNameExact:rows.filter(r=>r.ruoanhintaNameProbe.some(x=>x.exactCount>0)).length,sFilteredOk:rows.filter(r=>r.sKaupatFiltered.status===200).length,sFilteredExact:rows.filter(r=>r.sKaupatFiltered.exactCount>0).length,errors:rows.filter(r=>r.ruoanhinta.some(x=>x.error)||r.sKaupatDirect.error).length};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-ean-upstream-diagnostics.json',JSON.stringify({summary,storeIds:{ruoanhinta:stores,sGraphql:sStoreId},caveat:'Read-only limited diagnostic. S GraphQL store is not equivalent to Ruoanhinta S store; never infer coverage or absence from this sample.',rows},null,2));
console.log('EAN UPSTREAM DIAGNOSTICS:',JSON.stringify(summary));
console.log('EAN UPSTREAM CASES:',JSON.stringify(rows.map(r=>({query:r.query,kind:r.kind,ean:r.ean,ruoanhinta:r.ruoanhinta.map(x=>({store:x.store,status:x.status,itemCount:x.itemCount,exactCount:x.exactCount,verified:x.verified,examplePriceFields:x.examplePriceFields,error:x.error})),sDirect:r.sKaupatDirect,sFiltered:r.sKaupatFiltered,ruoanhintaName:r.ruoanhintaNameProbe.map(x=>({store:x.store,status:x.status,itemCount:x.itemCount,exactCount:x.exactCount,verified:x.verified,error:x.error}))}))));

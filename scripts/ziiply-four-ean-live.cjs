const fs=require('node:fs');
const EANS=['6416597113919','6408430000128','6408430030002','6411402202208'];
const BASE=process.env.ZIIPLY_BASE_URL||'https://ziiply.vercel.app';
const stores=[{key:'S',name:'Prisma Hyvinkää',id:'292',endpoint:'s-products'},{key:'K',name:'K-Citymarket Hyvinkää',id:'3221',endpoint:'k-products'}];
const report={date:new Date().toISOString(),base:BASE,eans:EANS,stores:{},errors:[]};
function normalize(p){return String(p?.ean||p?.gtin||p?.barcode||'').replace(/\D/g,'');}
function priceInfo(p,data){
  const n=Number(p?.price??p?.storeItems?.[0]?.price);
  const unit=String(p?.priceAmountUnit||data?.priceAmountUnit||'').toLowerCase();
  const source=String(data?.source||'');
  if(!Number.isFinite(n)||n<=0)return {raw:n,unit,priceCents:null,reason:'invalid_price'};
  if(['cent','cents'].includes(unit))return {raw:n,unit,priceCents:Math.round(n)};
  if(['eur','euro','euros'].includes(unit))return {raw:n,unit,priceCents:Math.round(n*100)};
  if(source==='s-kaupat-normal-v220')return {raw:n,unit:'EUR (source)',priceCents:Math.round(n*100)};
  return {raw:n,unit:unit||'unknown',priceCents:null,reason:'price_unit_unverified'};
}
async function search(store,ean){
  const url=new URL('/api/'+store.endpoint,BASE);
  url.searchParams.set('search',ean);url.searchParams.set('store',store.id);
  if(store.key==='S')url.searchParams.set('storeName',store.name);
  const res=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});
  if(!res.ok)throw Error('HTTP '+res.status+' '+url.pathname);
  const data=await res.json();
  const products=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
  return {products,source:data?.source||null,exact:products.filter(p=>normalize(p)===ean)};
}
async function main(){
  for(const store of stores){
    const rows=await Promise.all(EANS.map(async ean=>{
      try{
        const found=await search(store,ean);
        const exact=found.exact.map(p=>({name:p.name||p.title||'',ean:normalize(p),...priceInfo(p,{source:found.source})}));
        const priced=exact.filter(p=>p.priceCents!==null);
        const best=priced.sort((a,b)=>a.priceCents-b.priceCents)[0]||null;
        const row={ean,resultCount:found.products.length,exactCount:exact.length,source:found.source,best,exactSamples:exact.slice(0,5),status:best?'exact_priced':exact.length?'exact_price_unverified':'exact_not_found'};
        console.log('EAN_ROW',JSON.stringify({store:store.name,...row}));
        return row;
      }catch(e){const message=String(e);report.errors.push(store.key+' '+ean+' '+message);console.error('EAN_ERROR',store.name,ean,message);return {ean,status:'request_failed',error:message};}
    }));
    const missing=rows.filter(r=>r.status!=='exact_priced');
    const subtotalCents=rows.reduce((n,r)=>n+(r.best?.priceCents||0),0);
    report.stores[store.key]={name:store.name,rows,matched:4-missing.length,missing:missing.map(r=>r.ean),subtotalCents,complete:missing.length===0,totalCents:missing.length===0?subtotalCents:null};
    console.log('STORE_SUMMARY',JSON.stringify(report.stores[store.key]));
  }
  report.comparable=stores.every(s=>report.stores[s.key].complete);
  if(report.comparable)report.differenceCents=report.stores.K.totalCents-report.stores.S.totalCents;
  fs.mkdirSync('basket-reports',{recursive:true});
  fs.writeFileSync('basket-reports/four-ean-comparison.json',JSON.stringify(report,null,2));
  console.log('FINAL_REPORT',JSON.stringify({comparable:report.comparable,differenceCents:report.differenceCents??null,errors:report.errors}));
  if(report.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});

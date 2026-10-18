// Five deliberately different eight-product baskets, run one at a time.
// These are live product searches, not fabricated price fixtures.
const fs=require('node:fs');
const core=require('../.tmp-five-baskets/ziiplyCore.js');
const baskets=[["Aamupala",["rasvaton maito 1l","kananmuna 10kpl","kaurahiutale 1kg","ruisleipä 500g","voi 500g","kahvi 500g","banaani 1kg","jogurtti 1kg"]],["Päivällinen",["naudan jauheliha 400g","spagetti 500g","tomaattimurska 400g","sipuli 1kg","porkkana 1kg","juustoraaste 150g","kurkku 1kpl","salaatti 1kpl"]],["Ruokaostokset",["rasvaton maito 1l","spagetti 500g","tomaattimurska 400g","sipuli 1kg","porkkana 1kg","kahvi 500g","banaani 1kg","kaurakeksi 200g"]],["Välipalat",["perunalastut 200g","suklaalevy 200g","kivennäisvesi 1,5l","appelsiinimehu 1l","jäätelö 1l","popcorn 100g","pähkinät 200g","keksi 200g"]],["Pakasteet ja säilykkeet",["pakastepizza 350g","ranskalaiset perunat 500g","pakasteherneet 200g","tonnikala 185g","maissi 340g","papuja 380g","riisi 1kg","ketsuppi 500g"]]];
const n=Number(process.env.BASKET||1);
if(!Number.isInteger(n)||n<1||n>5)throw Error('Basket must be 1-5');
const [title,terms]=baskets[n-1];
const base='https://ziiply.vercel.app';
const report={basket:n,title,checkedAt:new Date().toISOString(),rows:[],warnings:[],errors:[]};
const fallbackQueries={
  "ranskalaiset perunat 500g":["ranskalaiset 500g","ranskanperunat 500g","Oolannin uunirapeat ranskalaiset","ranskalaiset pakaste"],
  "pakasteherneet 200g":["pakasteherneet","herneet pakaste","herne 200g","Apetit herne"],
  "maissi 340g":["maissinjyvät 340g","säilykemaissi","maissinjyvät","maissi säilyke"],
  "kananmuna 10kpl":["kananmuna","kananmunat","munat 10"],
  "banaani 1kg":["banaani","banaanit"],
  "naudan jauheliha 400g":["naudan jauheliha","nauta jauheliha","jauheliha 400g"],
  "kurkku 1kpl":["kurkku"],
  "salaatti 1kpl":["salaatti","keräsalaatti"],
  "wc-paperi 8rll":["wc-paperi","vessapaperi","toalettipaperi","wc paperi","8 rullaa"],
  "talouspaperi 4rll":["talouspaperi","talouspyyhe","4 rullaa"],
  "roskapussi 30l":["roskapussi","roskapussit","jätepussi","jätepussit","jätesäkki","roskapussi 30","jätepussi 30","sulkijanauhapussi"]
};
async function search(chain,term){
  const url=new URL('/api/'+(chain==='S'?'s-products':'k-products'),base);
  url.searchParams.set('search',term);
  url.searchParams.set('store',chain==='S'?'292':'N183');
  if(chain==='S')url.searchParams.set('storeName','Prisma Hyvinkää');
  const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!res.ok)throw Error(chain+' '+term+' HTTP '+res.status);
  const json=await res.json();
  const items=Array.isArray(json.items)?json.items:Array.isArray(json.products)?json.products:[];
  return items.filter(x=>x.name&&Number.isFinite(Number(x.price))&&Number(x.price)>0);
}
function cents(p){
  const unit=String(p.priceAmountUnit||'').toLowerCase();
  const amount=Number(p.price);
  if(unit==='cent'||unit==='cents')return Math.round(amount);
  if(unit==='eur'||unit==='euro'||unit==='euros')return Math.round(amount*100);
  // Feed may omit units. Record rather than silently guess.
  return null;
}
async function main(){
for(let i=0;i<terms.length;i++){
  const term=terms[i];
  const row={index:i+1,query:term,stores:{}};
  for(const chain of ['S','K']){
    try{
      let results=await search(chain,term);
      let compatible=results.filter(p=>core.isComparisonAttributeCompatible(term,p.name));
      for(const fallback of fallbackQueries[term]||[]){
        if(compatible.length)break;
        const extra=await search(chain,fallback);
        const names=new Set(results.map(p=>p.name));
        results=results.concat(extra.filter(p=>!names.has(p.name)));
        compatible=results.filter(p=>core.isComparisonAttributeCompatible(term,p.name));
      }
      const chosen=core.pickCheapestCompatibleComparisonProduct(term,results.map(p=>({...p,price:Number(p.price)})));
      const exact=chosen?results.find(p=>p.name===chosen.name):null;
      const raw=exact?Number(exact.price):null;
      const value=exact?cents(exact):null;
      const store={resultCount:results.length,compatibleCount:compatible.length,chosen:chosen?.name||null,rawPrice:raw,unit:exact?.priceAmountUnit||null,priceCents:value,alternatives:compatible.slice(0,3).map(p=>p.name),rejectedSamples:compatible.length?[]:results.slice(0,12).map(p=>({name:p.name,price:p.price,unit:p.priceAmountUnit||null}))};
      row.stores[chain]=store;
      if(chosen&&!core.isComparisonAttributeCompatible(term,chosen.name))report.errors.push(chain+' row '+(i+1)+' incompatible '+chosen.name);
      if(chosen&&!Number.isFinite(raw))report.errors.push(chain+' row '+(i+1)+' invalid price');
      if(chosen&&value===null)report.warnings.push(chain+' row '+(i+1)+' price unit not explicit; no cents total inferred');
      if(!chosen)report.warnings.push(chain+' row '+(i+1)+' no strictly compatible product');
      console.log('ROW',JSON.stringify({basket:n,...row}));
    }catch(e){row.stores[chain]={error:String(e)};report.errors.push(chain+' row '+(i+1)+' '+String(e));}
  }
  report.rows.push(row);
}
if(report.rows.length!==8)report.errors.push('Expected exactly eight rows');
for(const chain of ['S','K']){
  const rows=report.rows.map(r=>r.stores[chain]);
  const complete=rows.every(r=>r.chosen&&Number.isInteger(r.priceCents)&&r.priceCents>0);
  const total=complete?rows.reduce((sum,r)=>sum+r.priceCents,0):null;
  report[chain]={complete,totalCents:total,matched:rows.filter(r=>r.chosen).length,priced:rows.filter(r=>Number.isInteger(r.priceCents)).length};
}
report.cheapestComplete=report.S.complete&&report.K.complete?(report.S.totalCents<=report.K.totalCents?'S':'K'):null;
fs.mkdirSync('basket-reports',{recursive:true});
fs.writeFileSync('basket-reports/basket-'+n+'.json',JSON.stringify(report,null,2));
const summary=['# Basket '+n+': '+title,'','| # | Search | Prisma Hyvinkää | K-Citymarket Hyvinkää |','|---|---|---|---|',...report.rows.map(r=>'| '+r.index+' | '+r.query+' | '+(r.stores.S.chosen||'NO MATCH')+' | '+(r.stores.K.chosen||'NO MATCH')+' |'),'','S: '+JSON.stringify(report.S),'K: '+JSON.stringify(report.K),'Warnings: '+report.warnings.length,'Errors: '+report.errors.length,'','This tests live product search and shared matching rules; it does not automate the production cart UI.'].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
console.log('BASKET_SUMMARY',JSON.stringify({basket:n,title,S:report.S,K:report.K,cheapestComplete:report.cheapestComplete,warnings:report.warnings,errors:report.errors}));
if(!report.S.complete||!report.K.complete){
  console.error('INCOMPLETE_BASKET',JSON.stringify({S:report.S,K:report.K,warnings:report.warnings}));
  process.exitCode=1;
}
if(report.errors.length)process.exitCode=1;

}
main().catch(e=>{console.error(e);process.exitCode=1});

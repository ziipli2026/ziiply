// Live relevance coverage audit. This is not a price verification or a human-labelled accuracy benchmark.
const fs=require('node:fs');
const core=require('../.tmp-five-baskets/ziiplyCore.js');
const terms=[
  "rasvaton maito 1l",
  "kevytmaito 1l",
  "täysmaito 1l",
  "kaurajuoma 1l",
  "laktoositon maito 1l",
  "jogurtti 1kg",
  "maustamaton jogurtti 1kg",
  "rahka 250g",
  "raejuusto 200g",
  "kerma 2dl",
  "ruokakerma 2dl",
  "voi 500g",
  "margariini 400g",
  "juusto 1kg",
  "juustoraaste 150g",
  "kananmuna 10kpl",
  "kaurahiutale 1kg",
  "ruisleipä 500g",
  "paahtoleipä 500g",
  "näkkileipä 200g",
  "sämpylä 6kpl",
  "kahvi 500g",
  "tee 20kpl",
  "kaakaojauhe 200g",
  "sokeri 1kg",
  "vehnäjauho 1kg",
  "ruisjauho 1kg",
  "suola 1kg",
  "hunaja 500g",
  "hillo 400g",
  "banaani 1kg",
  "omena 1kg",
  "appelsiini 1kg",
  "päärynä 1kg",
  "sitruuna 1kg",
  "viinirypäleet 500g",
  "mansikka 250g",
  "mustikka 200g",
  "avokado 2kpl",
  "kiivi 500g",
  "peruna 1kg",
  "porkkana 1kg",
  "sipuli 1kg",
  "punasipuli 500g",
  "valkosipuli 100g",
  "kurkku 1kpl",
  "tomaatti 500g",
  "paprika 500g",
  "salaatti 1kpl",
  "parsakaali 400g",
  "kukkakaali 500g",
  "kesäkurpitsa 500g",
  "jäävuorisalaatti 1kpl",
  "herkkusieni 200g",
  "punajuuri 1kg",
  "naudan jauheliha 400g",
  "sika-nauta jauheliha 400g",
  "broilerin fileesuikale 300g",
  "broilerin rintafile 400g",
  "porsaan ulkofile 500g",
  "pekoni 170g",
  "nakit 400g",
  "lenkkimakkara 400g",
  "kinkkuleikkele 200g",
  "kalkkunaleikkele 200g",
  "lohi 300g",
  "kirjolohi 300g",
  "kalapuikot 300g",
  "tonnikala 185g",
  "sardiinit 120g",
  "katkarapu 200g",
  "spagetti 500g",
  "makaroni 400g",
  "penne pasta 500g",
  "riisi 1kg",
  "basmatiriisi 1kg",
  "jasmiiniriisi 1kg",
  "couscous 500g",
  "nuudelit 250g",
  "tomaattimurska 400g",
  "tomaattipyree 200g",
  "ketsuppi 500g",
  "sinappi 250g",
  "majoneesi 250g",
  "oliiviöljy 500ml",
  "rypsiöljy 1l",
  "etikka 500ml",
  "soijakastike 150ml",
  "maissi 340g",
  "papuja 380g",
  "kidneypavut 380g",
  "kikherneet 380g",
  "linssit 400g",
  "hernekeitto 435g",
  "ananas 227g",
  "persikka 410g",
  "kurkkusalaatti 400g",
  "punajuurisalaatti 400g",
  "pakastepizza 350g",
  "ranskalaiset perunat 500g",
  "pakasteherneet 200g",
  "pakastepinaatti 150g",
  "pakastemansikka 250g",
  "pakastekasvikset 500g",
  "jäätelö 1l",
  "jäätelöpuikko 6kpl",
  "perunalastut 200g",
  "popcorn 100g",
  "pähkinät 200g",
  "suklaalevy 200g",
  "kaurakeksi 200g",
  "keksi 200g",
  "karkkipussi 200g",
  "lakritsi 200g",
  "kivennäisvesi 1,5l",
  "appelsiinimehu 1l",
  "omenamehu 1l",
  "limonadi 1,5l",
  "energiajuoma 0,5l",
  "wc-paperi 8rll",
  "talouspaperi 4rll",
  "roskapussi 30l",
  "astianpesuaine 500ml",
  "pyykinpesuneste 1l",
  "nestesaippua 500ml",
  "shampoo 250ml",
  "hammastahna 75ml"
];
const shard=Number(process.env.SHARD||0),shards=4;
if(!Number.isInteger(shard)||shard<0||shard>=shards)throw Error('Invalid shard');
const requests=terms.map((term,i)=>({term,i})).filter(x=>x.i%shards===shard);
const base='https://ziiply.vercel.app';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchProducts(chain,term){
 const url=new URL('/api/'+(chain==='S'?'s-products':'k-products'),base);
 url.searchParams.set('search',term);
 url.searchParams.set('store',chain==='S'?'292':'N183');
 if(chain==='S')url.searchParams.set('storeName','Prisma Hyvinkää');
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(35000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();
   return (Array.isArray(json.items)?json.items:Array.isArray(json.products)?json.products:[])
     .filter(p=>p.name&&Number(p.price)>0);
  }catch(e){last=e;if(attempt<2)await sleep(800*(attempt+1));}
 }
 throw last;
}
function priceCents(p){
 const n=Number(p.price),unit=String(p.priceAmountUnit||'').toLowerCase();
 return unit==='cent'||unit==='cents'?Math.round(n):unit==='eur'||unit==='euro'||unit==='euros'?Math.round(n*100):null;
}
async function run(){
 const rows=[];
 for(const {term,i} of requests){
  const row={index:i+1,query:term,stores:{}};
  for(const chain of ['S','K']){
   try{
    const products=await fetchProducts(chain,term);
    const compatible=products.filter(p=>core.isComparisonAttributeCompatible(term,p.name));
    const chosen=core.pickCheapestCompatibleComparisonProduct(term,compatible);
    const cents=chosen?priceCents(chosen):null;
    row.stores[chain]={status:!chosen?'no_match':cents===null?'invalid_unit':'matched',
      results:products.length,compatible:compatible.length,chosen:chosen?.name||null,
      priceCents:cents,sourceUnit:chosen?.priceAmountUnit||null,
      rejectedSamples:compatible.length?[]:products.slice(0,5).map(p=>p.name)};
   }catch(e){row.stores[chain]={status:'error',error:String(e)};}
  }
  rows.push(row);console.log('AUDIT_ROW',JSON.stringify(row));
 }
 const all=rows.flatMap(row=>['S','K'].map(chain=>({query:row.query,chain,...row.stores[chain]})));
 const summary={shard,requests:rows.length,checks:all.length,
  matched:all.filter(x=>x.status==='matched').length,
  noMatch:all.filter(x=>x.status==='no_match').length,
  invalidUnit:all.filter(x=>x.status==='invalid_unit').length,
  errors:all.filter(x=>x.status==='error').length,
  matchedRate:all.length?Number((100*all.filter(x=>x.status==='matched').length/all.length).toFixed(1)):0,
  warning:'Matched rate measures strict-search coverage only; it does not establish product equivalence correctness or live shelf-price accuracy.'};
 fs.mkdirSync('relevance-reports',{recursive:true});
 fs.writeFileSync('relevance-reports/shard-'+shard+'.json',JSON.stringify({summary,rows},null,2));
 console.log('AUDIT_SUMMARY',JSON.stringify(summary));
 if(summary.errors)process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1});

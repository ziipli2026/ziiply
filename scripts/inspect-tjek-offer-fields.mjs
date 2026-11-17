// Diagnostic only. Query one publicly advertised Tjek offer and print field
// paths/types, never prices, descriptions, personal data, or raw payloads.
const ids = (process.env.TJEK_PUBLIC_OFFER_IDS || 'F455VH7rfhkbvjBhXCfmi,7A38SVgTsOHsUsW7-X_m5,uP65e3Xh3DVpROf43IoMx,tuM_di4gnuiuUFDW65nUU,TMBsndz2Baq06T9tCPzVQ,auaNlutxoSp8jNu1c8zW9,cxBI0DS2WqmBj8TuunZqz,Npxb1_hSrw2uT1vjPZgPE,VQeiQB813pBaQkFe0RnDN,xBrHYmnHa8cpvSwP0Lg9P,EiQSHtp6SpBkgWf1V8hKA,v-_VB2JYUfMoqqBzPNbMZ,ehZTLZy3kaF8ZYLrJyZjU,ttgzIYWhUjdoOR4N3ORJ7,EuhPS0_xkMbgHbiIxWtr9,Ol-WpZES_Sa0IsTOMlBOw').split(',');
for (const id of ids) {
const stable = v => JSON.stringify(v, (_k,x) => x && Object.prototype.toString.call(x)==='[object Object]' ? Object.keys(x).sort().reduce((a,k)=>(a[k]=x[k],a),{}) : x);
const key = Buffer.from(stable(['offer',{publicId:id}]),'utf8').toString('base64');
const response = await fetch('https://etarjouslehdet.fi/',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/plain, */*',Referer:'https://etarjouslehdet.fi/K-Citymarket'},body:JSON.stringify({data:[key]}),signal:AbortSignal.timeout(12000)});
if(!response.ok) throw new Error('Tjek HTTP '+response.status);
const lines=(await response.text()).split(/\r?\n/).filter(Boolean);
const match=lines.map(line=>{try{return JSON.parse(line)}catch{return null}}).find(v=>v?.key===key);
if(!match)throw new Error('Tjek response missing matching offer key');
const paths=[];
function visit(value,path='',depth=0){
  if(depth>6||!value||typeof value!=='object')return;
  for(const [k,v] of Object.entries(value)){
    const p=path?path+'.'+k:k;
    paths.push({path:p,type:Array.isArray(v)?'array':v===null?'null':typeof v});
    if(v && typeof v==='object')visit(v,p,depth+1);
  }
}
visit(match.value);
console.log('TJEK_CATEGORY_EVIDENCE',JSON.stringify({offerId:id,departmentSlug:match.value?.departmentSlug ?? null,unitSizeFrom:match.value?.unitSizeFrom ?? null,unitSizeTo:match.value?.unitSizeTo ?? null,baseUnit:match.value?.baseUnit ?? null,pieceCountFrom:match.value?.pieceCountFrom ?? null,pieceCountTo:match.value?.pieceCountTo ?? null}));
console.log('TJEK_OFFER_FIELD_PATHS',JSON.stringify({offerId:id,paths:paths.slice(0,250)}));
console.log('IDENTIFIER_FIELD_PATHS',JSON.stringify({offerId:id,paths:paths.filter(x=>/ean|gtin|barcode|product.?code|article.?number|sku|identifier/i.test(x.path))}));

}

// Post-merge read-only source inspection rerun.

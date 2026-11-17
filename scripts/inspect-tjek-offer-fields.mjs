// Diagnostic only. Query one publicly advertised Tjek offer and print field
// paths/types, never prices, descriptions, personal data, or raw payloads.
const id = process.env.TJEK_PUBLIC_OFFER_ID || 'F455VH7rfhkbvjBhXCfmi';
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
console.log('TJEK_OFFER_FIELD_PATHS',JSON.stringify(paths.slice(0,250)));
console.log('IDENTIFIER_FIELD_PATHS',JSON.stringify(paths.filter(x=>/ean|gtin|barcode|product.?code|article.?number|sku|identifier/i.test(x.path))));

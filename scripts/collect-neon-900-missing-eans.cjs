// Targeted recovery of EANs absent from desktop Neon search in 900-query audit.
// Collect evidence only; never overwrite canonical catalogue records from third-party data.
const fs=require('node:fs');
const expected=["6408430014804","8004030026018","2000410100008","2000436800005","6407800008252","2387966000007","6430104921217","2000629900000","2000604100005","6409531652223","8718963048275","7350153720670","6413467282508","6413467442407","6409531101196","6416192080012","6437005074899","8076800195019","8076802085912","6412000037094","4062300323520","6430012182113","0672201000068","6411300181445","7613035962965","8710522920664","8715700015026","6416453054813","7350028543762","6416453040502","6416453555105"];
const batches=JSON.parse(fs.readFileSync('scripts/fixtures/neon-900-queries.json','utf8')).batches;
const byEan=new Map(batches.flatMap((b,i)=>b.cases.map(c=>[String(c.expectedNeonEan),{...c,batch:i+1}])));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const results=[];
 for(const [i,ean] of expected.entries()){
  const ref=byEan.get(ean);
  if(!ref)throw Error('EAN missing from fixtures: '+ean);
  const entry={ean,query:ref.query,referenceName:ref.referenceName,batch:ref.batch,source:'Open Food Facts',status:'pending'};
  try{
   const url='https://world.openfoodfacts.org/api/v2/product/'+ean+'.json?fields=code,product_name,brands,categories';
   let response;
   for(let attempt=0;attempt<3;attempt++){
    response=await fetch(url,{headers:{'User-Agent':'Ziiply/1.0 (https://ziiply.fi)'},signal:AbortSignal.timeout(20000)});
    if(response.status!==429&&response.status<500)break;
    await sleep(3000*(attempt+1));
   }
   if(response.ok){
    const body=await response.json();
    if(body.status===1&&body.product?.product_name){
     entry.status='found';
     entry.foundName=body.product.product_name;
     entry.brand=body.product.brands||null;
     entry.sourceUrl='https://world.openfoodfacts.org/product/'+ean;
    }else entry.status='not_found';
   }else entry.status='http_'+response.status;
  }catch(err){entry.status='error';entry.error=String(err).slice(0,200)}
  results.push(entry);
  console.log((i+1)+'/'+expected.length,ean,entry.status,entry.foundName||'');
  await sleep(1200);
 }
 fs.writeFileSync('neon-missing-ean-collection.json',JSON.stringify({count:results.length,found:results.filter(x=>x.status==='found').length,results},null,2));
 const lines=['# Missing Neon EAN collection','', 'Targeted EAN lookup; **no database writes**.','', '| EAN | Reference product | OFF status | OFF name |','|---|---|---|---|',...results.map(r=>'| '+r.ean+' | '+r.referenceName.replace(/\\|/g,'/')+' | '+r.status+' | '+(r.foundName||'').replace(/\\|/g,'/')+' |')];
 fs.writeFileSync('neon-missing-ean-collection.md',lines.join('\n')+'\n');
 console.log('Collection complete:',results.length,'found:',results.filter(x=>x.status==='found').length);
})().catch(e=>{console.error(e);process.exitCode=1});

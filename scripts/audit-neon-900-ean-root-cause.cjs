// Read-only root-cause audit for 31 EANs absent from 900 desktop searches.
// Checks canonical Neon record and compares requested words against stored name.
const fs=require('node:fs');
const {neon}=require('@neondatabase/serverless');
const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/neon-900-queries.json','utf8'));
const eans=["6408430014804","8004030026018","2000410100008","2000436800005","6407800008252","2387966000007","6430104921217","2000629900000","2000604100005","6409531652223","8718963048275","7350153720670","6413467282508","6413467442407","6409531101196","6416192080012","6437005074899","8076800195019","8076802085912","6412000037094","4062300323520","6430012182113","0672201000068","6411300181445","7613035962965","8710522920664","8715700015026","6416453054813","7350028543762","6416453040502","6416453555105"];
const cases=fixture.batches.flatMap((b,i)=>b.cases.map(c=>({...c,batch:i+1})));
const refs=new Map(cases.map(c=>[c.expectedNeonEan,c]));
const fold=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
(async()=>{
 if(!process.env.DATABASE_URL)throw Error('Missing DATABASE_URL');
 const sql=neon(process.env.DATABASE_URL);
 const result=[];
 for(const ean of eans){
  const reference=refs.get(ean);
  if(!reference)throw Error('Missing fixture '+ean);
  const rows=await sql`SELECT ean,name,brand,source,category,aliases FROM public.ziiply_ean_products WHERE ean=${ean} LIMIT 1`;
  const record=rows[0]||null;
  const tokens=fold(reference.query).split(' ').filter(Boolean);
  const stored=fold(record?.name);
  const unmatched=tokens.filter(t=>!stored.split(' ').some(w=>w===t||w.startsWith(t)));
  const row={ean,batch:reference.batch,query:reference.query,referenceName:reference.referenceName,inNeon:!!record,storedName:record?.name||null,brand:record?.brand||null,source:record?.source||null,unmatchedTokens:unmatched,likelyNameMismatch:unmatched.length>0};
  result.push(row);
  console.log(JSON.stringify(row));
 }
 const summary={checked:result.length,present:result.filter(x=>x.inNeon).length,missing:result.filter(x=>!x.inNeon).length,withNameDifferences:result.filter(x=>x.likelyNameMismatch).length};
 fs.writeFileSync('neon-900-ean-root-cause.json',JSON.stringify({summary,results:result},null,2));
 fs.writeFileSync('neon-900-ean-root-cause.md',['# Neon 900 EAN root-cause audit','',JSON.stringify(summary),'','| EAN | Search | Neon name | Unmatched words |','|---|---|---|---|',...result.map(r=>`| ${r.ean} | ${r.query.replace(/\\|/g,'/')} | ${(r.storedName||'NOT FOUND').replace(/\\|/g,'/')} | ${r.unmatchedTokens.join(', ')} |`)].join('\n'));
 console.log('SUMMARY',JSON.stringify(summary));
})().catch(err=>{console.error(err);process.exitCode=1});

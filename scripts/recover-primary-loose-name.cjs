// One-off observed-name recovery from a primary retailer product page.
// The source name is parsed from the page, never copied from a test fixture.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {neon}=require('@neondatabase/serverless');
const {compatibleCatalogNames}=require('../src/lib/catalogNameEvidence.ts');
const {extractPrimaryName,addsOnlyLooseModifier}=require('./lib/primary-name-evidence.cjs');
const report={readOnly:process.env.APPLY_PRIMARY_NAME!=='1',observedAt:new Date().toISOString()};
const save=()=>fs.writeFileSync('neon-primary-name-recovery.json',JSON.stringify(report,null,2));
(async()=>{
 const ean=process.env.SOURCE_EAN,url=new URL(process.env.PRIMARY_SOURCE_URL);
 assert.ok(/^\d{8,14}$/.test(ean||''),'Expected EAN is required');
 assert.ok(url.protocol==='https:'&&url.hostname==='www.s-kaupat.fi'&&url.pathname.endsWith('/'+ean),'Verified primary product URL required');
 let response;report.attempts=[];
 for(let attempt=0;attempt<3;attempt++){
  response=await fetch(url,{headers:{accept:'text/html','accept-language':'fi','user-agent':'Mozilla/5.0 (compatible; Ziiply/1.0; +https://ziiply.fi)'},redirect:'error',signal:AbortSignal.timeout(20000)});
  const retryAfter=response.headers.get('retry-after');
  report.attempts.push({status:response.status,retryAfter});
  if(response.status!==429 || attempt===2)break;
  const seconds=retryAfter && /^\d+$/.test(retryAfter)?Number(retryAfter):10*(attempt+1);
  // Respect the provider's backoff; long retry windows need a later run.
  if(seconds>60)break;
  await new Promise(resolve=>setTimeout(resolve,Math.max(1,seconds)*1000));
 }

 assert.equal(response.status,200,'Primary product page unavailable');
 report.sourceUrl=url.toString();report.evidence=extractPrimaryName(await response.text(),ean);
 const sql=neon(process.env.DATABASE_URL);
 const [current]=await sql`SELECT ean,name,quantity,category,aliases FROM ziiply_ean_products WHERE ean=${ean} LIMIT 1`;
 assert.ok(current,'Current product missing');report.before=current;
 assert.ok(/^hedelmat-ja-vihannekset\//.test(String(current.category)),'Current fresh-produce taxonomy is required');
 assert.ok(addsOnlyLooseModifier(current.name,report.evidence.name),'Primary name changes more than the loose-sale attribute');
 assert.ok(compatibleCatalogNames(current.name,report.evidence.name,current.quantity),'Conflicting package or preparation');
 if(!report.readOnly){
  const updated=await sql`UPDATE ziiply_ean_products SET aliases=ARRAY(
   SELECT x FROM unnest(ARRAY[${report.evidence.name},name] || aliases) WITH ORDINALITY AS observed(x,position)
   WHERE TRIM(x)<>'' GROUP BY x ORDER BY MIN(position) LIMIT 24
  ),updated_at=NOW() WHERE ean=${ean} AND name=${current.name} AND quantity IS NOT DISTINCT FROM ${current.quantity} RETURNING ean,name,aliases`;
  assert.equal(updated.length,1,'Current record changed during recovery');report.after=updated[0];
 }
 save();console.log('PRIMARY RECOVERY',JSON.stringify(report));
})().catch(error=>{report.error=String(error);save();console.error(error);process.exitCode=1});

// Restore lost catalogue observations from a source-run artifact, not from
// regression expectations. Current names, sizes and categories stay unchanged.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {neon}=require('@neondatabase/serverless');
const {compatibleCatalogNames}=require('../src/lib/catalogNameEvidence.ts');
const baseline=JSON.parse(fs.readFileSync('neon-31-corrected.json','utf8'));
const pending=baseline.results.filter(r=>!r.found);
const directory=process.env.HISTORY_SOURCE_DIR;
const apply=process.env.APPLY_NAME_HISTORY==='1';
const sourceRun=process.env.HISTORY_SOURCE_RUN;
const report={sourceRun,readOnly:!apply,results:[]};
const save=()=>fs.writeFileSync('neon-name-history-restore.json',JSON.stringify(report,null,2));
(async()=>{
 assert.ok(directory&&sourceRun,'History source directory and run ID are required');
 assert.ok(process.env.DATABASE_URL,'Missing DATABASE_URL');
 const evidence=new Map();
 for(const file of fs.readdirSync(directory).filter(f=>/^neon-100-live-\d+\.json$/.test(f))){
  const snapshot=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));
  const age=Date.now()-Date.parse(snapshot.runAt);
  assert.ok(Number.isFinite(age)&&age>=0&&age<24*60*60*1000,'History snapshot must be less than 24 hours old');
  for(const r of snapshot.results){
   // Raw is the stored Neon observation, before desktop/display processing.
   for(const p of r.raw?.products||[]){
    if(!/^\d{8,14}$/.test(String(p.ean))||typeof p.name!=='string')continue;
    if(!evidence.has(p.ean))evidence.set(p.ean,[]);
    evidence.get(p.ean).push({name:p.name,sourceFile:file,observedAt:snapshot.runAt,observationQuery:r.query});
   }
  }
 }
 assert.ok(evidence.size,'No independent raw catalogue observations found');
 const sql=neon(process.env.DATABASE_URL);
 for(const c of pending){
  const [current]=await sql`SELECT ean,name,brand,quantity,category,aliases FROM ziiply_ean_products WHERE ean=${c.ean} LIMIT 1`;
  const row={ean:c.ean,before:current||null,evidence:evidence.get(c.ean)||[],status:'pending'};
  report.results.push(row);
  if(!current){row.status='missing_current_record';continue;}
  // Restricted-circulation/variable-weight codes can be reused between
  // producers and stores; an old name is not sufficient identity evidence.
  if(/^2/.test(c.ean)){row.status='restricted_circulation_code_requires_review';continue;}
  const safe=[...new Set(row.evidence.filter(e=>compatibleCatalogNames(current.name,e.name,current.quantity)).map(e=>e.name))];
  row.safeNames=safe;
  if(!safe.length){row.status='no_compatible_history';continue;}
  if(apply){
   const changed=await sql`UPDATE ziiply_ean_products SET aliases=ARRAY(
     SELECT x FROM unnest(${safe}::text[] || ARRAY[name] || aliases) WITH ORDINALITY AS observed(x,position)
     WHERE TRIM(x)<>'' GROUP BY x ORDER BY MIN(position) LIMIT 24
   ),updated_at=NOW() WHERE ean=${c.ean} AND name=${current.name} AND quantity IS NOT DISTINCT FROM ${current.quantity} RETURNING ean,aliases`;
   row.status=changed.length?'restored':'record_changed_retry_required';row.after=changed[0]||null;
  }else row.status='ready_to_restore';
  console.log(JSON.stringify({ean:c.ean,status:row.status,names:safe}));save();
 }
 report.summary={checked:report.results.length,restored:report.results.filter(r=>r.status==='restored').length,review:report.results.filter(r=>r.status==='restricted_circulation_code_requires_review').length};
 save();console.log('HISTORY SUMMARY',JSON.stringify(report.summary));
})().catch(error=>{save();console.error(error);process.exitCode=1});

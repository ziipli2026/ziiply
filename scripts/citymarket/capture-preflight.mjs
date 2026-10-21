import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';

const [period,folder]=process.argv.slice(2);
if(!/^\d{4}-\d{2}-\d{2}-W\d{1,2}-(AV|LV)$/.test(period||'')||!folder)throw Error('Usage: capture-preflight.mjs YYYY-MM-DD-Www-AV|LV output-folder');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required: a silent, unreported capture is not an advance check');
const sql=neon(process.env.DATABASE_URL);
const kind=period.endsWith('-LV')?'LV':'AV';
const week=Number(period.match(/-W(\d+)-/)[1]);
const issue=String(week).padStart(2,'0')+kind;
const entry=kind==='LV'?'https://kcm-lehdet.k-ruoka.fi/loppuviikon_tarjouslehdet/':'https://kcm-lehdet.k-ruoka.fi/alkuviikon_tarjouslehdet/';
await fs.mkdir(folder,{recursive:true});
let details={period,issue,pdfReview:'pending',runUrl:process.env.GITHUB_SERVER_URL&&process.env.GITHUB_REPOSITORY&&process.env.GITHUB_RUN_ID?`${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null};
let ok=false,count=0,outcome='source-archive-failed';
try{
  const attempts=await sql`SELECT checked_at::text,ok,offer_count,details FROM ziiply_publication_run_log
    WHERE source='k-citymarket-cache' AND (details->'next'->>'period'=${period}
      OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(details->'errors','[]'::jsonb)) e WHERE e LIKE ${'next '+period+':%'}))
    ORDER BY checked_at ASC LIMIT 1`;
  if(!attempts.length)throw Error('First automatic parser attempt has not been recorded for '+period);
  details.firstParserAt=attempts[0].checked_at;
  details.firstParserOk=attempts[0].details?.next?.period===period;
  const child=spawnSync(process.execPath,['scripts/citymarket/export-leaflet.mjs',entry,folder],{encoding:'utf8',timeout:180000});
  if(child.status!==0)throw Error('Source capture failed: '+String(child.stderr||child.stdout||child.error||child.status).slice(-1600));
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'archive-manifest.json'),'utf8'));
  if(!String(manifest.publisherUrl).toUpperCase().includes('_'+issue+'_KCM'))throw Error('Publisher returned a different issue: '+manifest.publisherUrl);
  const pdf=await fs.readFile(path.join(folder,'leaflet.pdf'));
  if(createHash('sha256').update(pdf).digest('hex')!==manifest.pdfSha256)throw Error('PDF checksum mismatch');
  const frozen=JSON.parse(await fs.readFile(path.join(folder,'publisher-responses.json'),'utf8'));
  if(!Object.keys(frozen.responses||{}).length)throw Error('Frozen publisher geometry missing');
  const evidence=JSON.parse(await fs.readFile(path.join(folder,'parser-evidence.json'),'utf8'));
  const accepted=JSON.parse(await fs.readFile(path.join(folder,'leaflet.json'),'utf8'));
  if(!manifest.pageCount||!manifest.offerCount||manifest.offerCount!==accepted.rows.length)throw Error('Empty/inconsistent archive');
  const placements=new Map();
  const unresolved=[],unverified=[],duplicates=[];
  for(const row of evidence.rows){
    const key=row.page+'|'+row.title;
    if(placements.has(key))duplicates.push(key);
    placements.set(key,row);
    const percent=Number(row.percentageOffer?.percent);
    if(!(Number(row.spatialResolved?.value)>0)&&!(percent>0&&percent<100))unresolved.push(key);
    else if(row.spatialResolved&&row.spatialResolved.sanity!=='pass')unverified.push(key);
  }
  count=accepted.rows.length;
  details={...details,sourceVerified:true,publisherUrl:manifest.publisherUrl,pdfSha256:manifest.pdfSha256,
    pages:manifest.pageCount,count,parserRows:evidence.rows.length,unresolved,unverified,duplicates,
    auditScope:'Frozen source and automatic parser checks; full printed PDF comparison pending'};
  // Source capture is explicitly not a full price/quantity/category approval.
  ok=unresolved.length===0&&unverified.length===0&&duplicates.length===0;
  outcome=ok?'source-archive-captured':'source-archive-review-needed';
  await fs.writeFile(path.join(folder,'preflight-report.json'),JSON.stringify({ok,outcome,...details},null,2));
}catch(error){details.error=error instanceof Error?error.message:String(error);}
await fs.writeFile(path.join(folder,'preflight-report.json'),JSON.stringify({ok,outcome,...details},null,2));
await sql`INSERT INTO ziiply_publication_run_log(chain,source,ok,offer_count,outcome,details)
  VALUES ('K-Citymarket','k-citymarket-source-audit',${ok},${count},${outcome},${JSON.stringify(details)}::jsonb)`;
console.log(JSON.stringify({ok,outcome,...details},null,2));
if(!ok)process.exitCode=1;

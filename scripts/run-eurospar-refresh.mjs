import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required: EUROSPAR refresh must be reported to Control Center');
const sql=neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS ziiply_publication_run_log (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), chain TEXT NOT NULL, source TEXT NOT NULL, ok BOOLEAN NOT NULL, offer_count INTEGER NOT NULL, outcome TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb)`;
let ok=false,count=0,error='';
const result=spawnSync(process.execPath,['scripts/eurospar-feed-refresh.mjs'],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
try{
 if(result.status!==0)throw Error(String(result.stderr||result.error||'Refresh failed').slice(-2500));
 const candidate=JSON.parse(readFileSync('eurospar-feed-candidate.json','utf8'));
 if(!candidate.ready)throw Error(candidate.reason||'Candidate validation failed');
 const feed=JSON.parse(readFileSync('eurospar-feed.generated.json','utf8'));
 count=feed.offers.length;ok=true;
}catch(e){
 const raw=String(e);
 const coverage=raw.match(/Incomplete PDF coverage(?: on page (\d+))?: (\d+)\/(\d+) product headings(?:; unmatched=(\[[^\n]*\]))?/);
 if(coverage){
  const [,page,matched,total,unmatched]=coverage;
  let names='';
  try{names=(JSON.parse(unmatched||'[]')).map(x=>x.name).filter(Boolean).join(', ');}catch{}
  error='EUROSPAR PDF: '+(Number(total)-Number(matched))+' tuotetta jäi ilman luotettavaa hintayhdistelmää ('+matched+'/'+total+(page?', sivu '+page:'')+').'+(names?' Tarkista: '+names+'.':'')+' Vanhaa tarjousaineistoa ei korvattu. Katso GitHub-ajon loki.';
 }else error=raw.slice(-1500);
}
const runUrl=`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
await sql`INSERT INTO ziiply_publication_run_log(chain,source,ok,offer_count,outcome,details)
 VALUES ('TOKMANNI-SPAR','eurospar-publication-refresh',${ok},${count},${ok?'eurospar-refresh-ok':'eurospar-refresh-failed'},${JSON.stringify({error,runUrl})}::jsonb)`;
if(!ok)process.exitCode=1;

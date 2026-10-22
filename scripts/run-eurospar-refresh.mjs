import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required: EUROSPAR refresh must be reported to Control Center');
const sql=neon(process.env.DATABASE_URL);
let ok=false,count=0,error='';
const result=spawnSync(process.execPath,['scripts/eurospar-feed-refresh.mjs'],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
try{
 if(result.status!==0)throw Error(String(result.stderr||result.error||'Refresh failed').slice(-2500));
 const candidate=JSON.parse(readFileSync('eurospar-feed-candidate.json','utf8'));
 if(!candidate.ready)throw Error(candidate.reason||'Candidate validation failed');
 const feed=JSON.parse(readFileSync('eurospar-feed.generated.json','utf8'));
 count=feed.offers.length;ok=true;
}catch(e){error=String(e).slice(-2500);}
const runUrl=`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
await sql`INSERT INTO ziiply_publication_run_log(chain,source,ok,offer_count,outcome,details)
 VALUES ('TOKMANNI-SPAR','eurospar-publication-refresh',${ok},${count},${ok?'eurospar-refresh-ok':'eurospar-refresh-failed'},${JSON.stringify({error,runUrl})}::jsonb)`;
if(!ok)process.exitCode=1;

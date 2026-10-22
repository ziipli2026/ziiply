import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
const run=event.workflow_run;
if(!run||run.name==='Report automation health')process.exit(0);
if(run.head_branch!=='main'||run.head_repository?.full_name!==process.env.GITHUB_REPOSITORY)process.exit(0);
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL missing: automation result cannot be reported');
const name=run.name.toLowerCase();
const chain=/eurospar|spar|tokmanni/.test(name)?'TOKMANNI-SPAR':/citymarket|kcitymarket|k-ruoka|kruoka|k-chain|k-market|k-supermarket/.test(name)?'K':/lidl/.test(name)?'Lidl':/s-kaupat|prisma|coop|s-market/.test(name)?'S':'AUTOMAATIOT';
const completed=event.action==='completed';
const ok=completed&&run.conclusion==='success';
if(completed&&run.conclusion==='skipped')process.exit(0);
const outcome=completed?(ok?'workflow-succeeded':'workflow-'+run.conclusion):'workflow-running';
const sql=neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS ziiply_publication_run_log (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), chain TEXT NOT NULL, source TEXT NOT NULL, ok BOOLEAN NOT NULL, offer_count INTEGER NOT NULL, outcome TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb)`;
await sql`INSERT INTO ziiply_publication_run_log(chain,source,ok,offer_count,outcome,details)
 VALUES (${chain},${'github-workflow:'+run.workflow_id},${ok},0,${outcome},${JSON.stringify({workflow:run.name,runUrl:run.html_url,runId:run.id,attempt:run.run_attempt,error:ok?'':completed?'GitHub-ajo päättyi tilaan '+run.conclusion:'Ajo käynnissä; onnistumista ei vielä vahvistettu',startedAt:run.run_started_at})}::jsonb)`;
console.log(run.name+': '+outcome);

import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';

// Report the final verified artifact, not just a parser attempt. This also
// covers workflow_dispatch and corrections pushed manually to main.
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required for Control Center confirmation');
const sql=neon(process.env.DATABASE_URL);
const feed=JSON.parse(readFileSync('src/app/components/ziiply/offerSearch/providers/eurospar-feed.json','utf8'));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const offers=Array.isArray(feed.offers)?feed.offers:[];
const valid=feed.healthy===true && offers.length>0 &&
  feed.validity?.from<=today && feed.validity?.to>=today &&
  offers.every(o=>o.name && Number(o.offerPrice)>0 && o.validFrom && o.validTo);
const runUrl='https://github.com/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID;
const details={issue:feed.issue,validity:feed.validity,runUrl,commit:process.env.GITHUB_SHA,
  verification:'post-promotion',trigger:process.env.GITHUB_EVENT_NAME,source:'eurospar'};
await sql`INSERT INTO ziiply_publication_run_log(chain,source,ok,offer_count,outcome,details)
VALUES ('TOKMANNI-SPAR','eurospar-verified-publication',${valid},${offers.length},${valid?'validated-feed-ok':'validated-feed-failed'},${JSON.stringify(details)}::jsonb)`;
console.log(JSON.stringify({valid,offers:offers.length,...details}));
if(!valid)process.exitCode=1;

import { collectNational, persistNational } from './lib/tankkaus-national.mjs';
const batch=await collectNational({token:process.env.TANKKAUS_API_TOKEN,onPage:p=>console.log(JSON.stringify({stage:'page',...p}))});
if(process.env.TANKKAUS_NATIONAL_WRITE!=='YES_TEST_BRANCH') {
  console.log(JSON.stringify({ok:true,mode:'dry-run',...batch.report}));
} else {
  if(!process.env.TANKKAUS_TEST_DATABASE_URL) throw new Error('TANKKAUS_TEST_DATABASE_URL missing');
  const {neon}=await import('@neondatabase/serverless');
  const sql=neon(process.env.TANKKAUS_TEST_DATABASE_URL);
  const saved=await persistNational(sql,batch);
  if(process.env.TANKKAUS_VERIFY_IDEMPOTENCY==='true') {
    const repeated=await persistNational(sql,batch);
    if(repeated.insertedObservations!==0||repeated.insertedRawObservations!==0) throw new Error('Duplicate ingestion inserted repeated events');
    console.log(JSON.stringify({ok:true,test:'same-batch-idempotency',...repeated}));
  }
  const totals=await sql`SELECT fuel_type,count(*) AS observations,max(observed_at) AS newest FROM ziiply_fuel_price_observations WHERE source='tankkaus.com' GROUP BY fuel_type ORDER BY fuel_type`;
  console.log(JSON.stringify({ok:true,mode:'test-branch-write',...batch.report,...saved,databaseTotals:totals}));
}

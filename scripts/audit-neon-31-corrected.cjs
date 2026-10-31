// Run the actual route against Neon, independent of deployment alias readiness.
require('./recipe-audit-runtime.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {NextRequest}=require('next/server');
const {GET}=require('../src/app/api/neon-first-search/route.ts');
const fixed=new Set(['6408430014804','8004030026018','7350153720670','6409531101196','6411300181445','7613035962965','8715700015026','6416453054813']);
const cases=require('./fixtures/neon-31-canonical.json');
(async()=>{
 assert.ok(process.env.DATABASE_URL,'Missing DATABASE_URL');
 const results=[];
 for(const c of cases){
  const response=await GET(new NextRequest('http://localhost/api/neon-first-search?desktop=1&q='+encodeURIComponent(c.query)));
  const body=await response.json();
  assert.equal(response.status,200,JSON.stringify(body));
  const found=body.products.some(p=>p.ean===c.ean);
  const row={ean:c.ean,query:c.query,found,expectedFixed:fixed.has(c.ean),count:body.count,storedName:c.storedName};
  results.push(row);console.log(JSON.stringify(row));
 }
 const report={results,recovered:results.filter(r=>r.found).length,remaining:results.filter(r=>!r.found).length};
 fs.writeFileSync('neon-31-corrected.json',JSON.stringify(report,null,2));
 console.log('SUMMARY',JSON.stringify({recovered:report.recovered,remaining:report.remaining}));
 assert.ok(results.filter(r=>r.expectedFixed).every(r=>r.found),'A verified correction still loses its EAN');
})().catch(error=>{console.error(error);process.exitCode=1});

// 100 distinct query checks for each desktop search surface, using the actual shared TypeScript engine.
// These are deterministic qualification regressions, not live provider availability tests.
require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {desktopSearchDecision,desktopSearchQueries}=require('../src/app/components/ziiply/search/desktopNormalRelevance.ts');
const queries=JSON.parse(fs.readFileSync('scripts/fixtures/generic-100-batch-2.json','utf8')).queries;
assert.equal(queries.length,100);
assert.equal(new Set(queries).size,100);
const desktop=fs.readFileSync('src/app/desktop-preview/DesktopPreviewClient.tsx','utf8');
assert.match(desktop,/const matching=results\.filter\(\(offer:any\)=>desktopSearchDecision\(query,/,'Gösta live filtering must use shared engine');
assert.match(desktop,/const valid=saved\.results\.filter/);
assert.match(desktop,/return desktopSearchDecision\(query,\{\.\.\.offer,name:title,category\}\)\.accepted/,'Gösta cached filtering must use shared engine');
assert.match(desktop,/const included=recipeAllows\(product\)&&Boolean\(recipeIngredient\|\|!normalRejected\)/,'Recipe ingredient filters must remain active');
assert.match(desktop,/const normalRejected=!desktopSearchDecision\(query,product\)\.accepted/,'Recipe ordinary search must use shared engine');
assert.match(desktop,/recipeCoverageQueries\(query, recipeIngredient/,'Recipe coverage must be preserved');
assert.match(desktop,/prioritizeRecipeFishProducts\(recipeIngredient\.name/,'Recipe special filtering must be preserved');
const report={commit:process.env.GITHUB_SHA||'',runAt:new Date().toISOString(),scope:'Shared search-engine functional regression; no live provider requests',results:{gosta:[],justiina:[]}};
for(const query of queries){
  for(const mode of ['gosta','justiina']){
    const offer={name:query,title:query,category:'',__price:2.99,validUntil:'2099-12-31'};
    const decision=desktopSearchDecision(query,offer);
    const expansions=desktopSearchQueries(query);
    const errors=[];
    if(!decision.accepted)errors.push('Exact product title rejected by shared engine');
    if(!expansions.length)errors.push('No search query expansions');
    if(mode==='gosta' && !offer.validUntil)errors.push('Missing offer validity');
    // Recipe-specific ingredient compatibility is intentionally unchanged, not replaced with this generic test.
    report.results[mode].push({query,accepted:decision.accepted,expansionCount:expansions.length,errors});
    console.log(mode,query,errors.length?'FAIL '+errors.join('; '):'PASS');
  }
}
report.summary=Object.fromEntries(Object.entries(report.results).map(([mode,rows])=>[mode,{total:rows.length,passed:rows.filter(x=>!x.errors.length).length,failed:rows.filter(x=>x.errors.length).length}]));
fs.writeFileSync('desktop-gosta-justiina-100-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(Object.values(report.summary).some(x=>x.failed))process.exitCode=1;

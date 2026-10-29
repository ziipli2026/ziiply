#!/usr/bin/env node
// Read-only live regression checks. Exit nonzero on relevance regressions.
const base = process.env.SEARCH_BASE_URL;
if (base !== 'http://127.0.0.1:3099') throw Error('Refusing external deployment: test must run against checked-out local code');
const cases = [
  {q:'maito', positive:/\b(maito|kevytmaito|täysmaito|maitojuoma)\b/i, negative:/juusto|margariini|maitohappobakteeri|koiranruoka/i},
  {q:'peruna', positive:/\bperuna\b|\bperunat\b/i, negative:/koiranruoka|perunavuoka|perunamuusi|kermaperuna|peruna-sipulisekoitus/i},
  {q:'kahvi', positive:/kahvi/i, negative:/kahvinkeitin|kahvikuppi|kahvinsuodatin/i},
  {q:'jauheliha', positive:/jauheliha/i, negative:/koiranruoka|kastike|pizza/i},
  {q:'banaani', positive:/banaani/i, negative:/koiranruoka|jogurtti|mehu/i},
  {q:'olut', positive:/olut|lager|pils/i, negative:/oluthiiva|olutlasi/i},
  {q:'laktoositon maito', positive:/maito/i, negative:/juusto|margariini/i},
  {q:'Valio', positive:/valio/i, negative:/^$/},
  {q:'omena', positive:/omena/i, negative:/koiranruoka|shampoo/i},
  {q:'tomaatit', positive:/tomaatt|tomaat/i, negative:/koiranruoka/i},
  {q:'kurkku', positive:/kurkku/i, negative:/kurkkupastilli/i},
  {q:'sipuli', positive:/sipuli/i, negative:/koiranruoka/i},
  {q:'porkkana', positive:/porkkana/i, negative:/koiranruoka/i},
  {q:'kananmuna', positive:/kananmuna|munia/i, negative:/koiranruoka/i},
  {q:'voi', positive:/voi/i, negative:/voileipä|voikukka/i},
  {q:'juusto', positive:/juusto/i, negative:/koiranruoka/i},
  {q:'jogurtti', positive:/jogurtti|jugurtti/i, negative:/koiranruoka/i},
  {q:'riisi', positive:/riisi/i, negative:/koiranruoka/i},
  {q:'pasta', positive:/pasta|makaroni/i, negative:/hammastahna/i},
  {q:'jauho', positive:/jauho/i, negative:/koiranruoka/i},
  {q:'sokeri', positive:/sokeri/i, negative:/sokeriton/i},
  {q:'suola', positive:/suola/i, negative:/suolakurkk|suolapähkinä/i},
  {q:'öljy', positive:/öljy/i, negative:/moottoriöljy/i},
  {q:'kana', positive:/kana/i, negative:/koiranruoka/i},
  {q:'kala', positive:/kala|lohi|seiti/i, negative:/kalapuikko/i},
  {q:'leipä', positive:/leipä/i, negative:/leipäveitsi/i},
  {q:'perunat', positive:/peruna/i, negative:/koiranruoka/i},
  {q:'maidot', positive:/maito/i, negative:/juusto|margariini/i},
  {q:'6413300102017', ean:'6413300102017'}
];
const report = [];
for (const test of cases) {
  const url = base + '/api/neon-first-search?q=' + encodeURIComponent(test.q);
  try {
    const t=Date.now();
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    const products=data.products||[];
    const top=products.slice(0,10);
    const failures=[];
    if (!response.ok || !data.ok) failures.push('api-error');
    if (!products.length) failures.push('empty');
    if (test.ean && products[0]?.ean!==test.ean) failures.push('ean-not-first');
    if (test.positive && !top.some(x=>test.positive.test(x.name))) failures.push('no-relevant-top10');
    if (test.negative && top.slice(0,3).some(x=>test.negative.test(x.name))) failures.push('irrelevant-top3');
    report.push({query:test.q,ms:Date.now()-t,total:products.length,top:top.map(x=>({name:x.name,category:x.category,rank:x.rank})),failures});
  } catch(e) {report.push({query:test.q,failures:[String(e)]});}
}
// Live database intent guard: actual lactose-free milk must precede chocolate.
const lactoseResponse=await fetch(base+'/api/neon-first-search?q='+encodeURIComponent('laktoositon maito'),{signal:AbortSignal.timeout(15000)});
const lactoseData=await lactoseResponse.json();
const lactoseTop=(lactoseData.products||[]).slice(0,10);
const lactoseFailures=[];
if(!lactoseResponse.ok||!lactoseData.ok)lactoseFailures.push('api-error');
if(!lactoseTop.length)lactoseFailures.push('empty');
if(lactoseTop[0] && /suklaa|konvehti|patukka/i.test(lactoseTop[0].name))lactoseFailures.push('chocolate-first');
if(!lactoseTop.slice(0,5).some(p=>/laktoositon/i.test(p.name)&&/\\bmaito\\b|kevytmaito|täysmaito/i.test(p.name)&&!/suklaa|konvehti|patukka/i.test(p.name)))lactoseFailures.push('no-actual-milk-top5');
console.log('LIVE LACTOSE INTENT:',JSON.stringify({failures:lactoseFailures,top5:lactoseTop.slice(0,5).map(p=>({name:p.name,category:p.category,rank:p.rank}))}));
if(lactoseFailures.length)process.exitCode=1;
// Additional observational tests: do not gate baseline until expected ordering is validated.
const intentQueries=['makkarat','makkara','koiranmakkara','koiran makkara','koiranruoka','kissanruoka'];
const intentReport=[];
const intentFailures=[];
for(const q of intentQueries){
 try{
  const t=Date.now();
  const response=await fetch(base+'/api/neon-first-search?q='+encodeURIComponent(q),{signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  const top=(data.products||[]).slice(0,10);
  const petCategory=p=>/lemmikit|lemmikkielaimet|koiran|kissan|lemmikki/i.test(String(p.category||''));
  intentReport.push({query:q,ok:response.ok&&data.ok,ms:Date.now()-t,
   top10PetCategoryCount:top.filter(petCategory).length,
   top5PetCategoryCount:top.slice(0,5).filter(petCategory).length,
   top:top.map(p=>({name:p.name,category:p.category,rank:p.rank,petCategory:petCategory(p)}))});
 }catch(error){intentReport.push({query:q,error:String(error)});intentFailures.push(q+':request-error')}
}
for(const r of intentReport){
 if(!r.ok){intentFailures.push(r.query+':api-error');continue}
 if(['makkarat','makkara'].includes(r.query) && r.top5PetCategoryCount>0)intentFailures.push(r.query+':pet-products-in-top5');
 if(['koiranmakkara','koiran makkara'].includes(r.query) && r.top5PetCategoryCount===0)intentFailures.push(r.query+':pet-products-missing');
}
console.log('INTENT ASSERTIONS:',intentFailures.length?'FAIL '+intentFailures.join(', '):'PASS');
// Contract checks across representative queries; avoid hard-coded category relevance expectations.
const contractQueries=['maito','makkarat','koiran makkara','Valio','6413300102017'];
const contractReport=[];
for(const q of contractQueries){
 const failures=[];
 try{
  const response=await fetch(base+'/api/neon-first-search?q='+encodeURIComponent(q),{signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  const products=data.products||[];
  if(!response.ok||data.ok!==true)failures.push('api-error');
  if(data.readOnly!==true)failures.push('not-read-only');
  if(data.query!==q)failures.push('query-mismatch');
  if(!Array.isArray(data.products))failures.push('missing-products-array');
  if(data.count!==products.length)failures.push('count-mismatch');
  if(products.length>100)failures.push('over-limit');
  if(data.truncated!==(products.length===100))failures.push('truncated-contract-mismatch');
  if(!String(data.searchVersion||'').includes('sausage'))failures.push('unexpected-version');
  if(products.some(p=>!p.ean||!p.name||typeof p.rank!=='number'))failures.push('invalid-product');
  if(products.some((p,i)=>i>0&&p.rank<products[i-1].rank))failures.push('rank-out-of-order');
  if(new Set(products.map(p=>p.ean)).size!==products.length)failures.push('duplicate-ean');
  if(products.some(p=>Object.hasOwn(p,'price')||Object.hasOwn(p,'priceEur')))failures.push('unexpected-price-field');
  contractReport.push({query:q,count:products.length,version:data.searchVersion,failures});
 }catch(error){failures.push(String(error));contractReport.push({query:q,failures})}
}
console.log('CONTRACT ASSERTIONS:',JSON.stringify(contractReport.map(r=>({query:r.query,count:r.count,failures:r.failures}))));
const fs=await import('node:fs');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-search-contract-checks.json',JSON.stringify({at:new Date().toISOString(),checks:contractReport},null,2));
fs.writeFileSync('artifacts/neon-search-intent-diagnostics.json',JSON.stringify({at:new Date().toISOString(),note:'Observational only; no pass/fail relevance inference from category alone',queries:intentReport},null,2));
console.log('INTENT DIAGNOSTICS:',JSON.stringify(intentReport.map(r=>({query:r.query,ok:r.ok,top5PetCategoryCount:r.top5PetCategoryCount,error:r.error}))));
fs.writeFileSync('artifacts/neon-search-regression.json',JSON.stringify({base,at:new Date().toISOString(),report},null,2));
for(const r of report) console.log((r.failures.length?'FAIL':'PASS')+' '+r.query+' '+r.ms+'ms '+r.failures.join(', '));
if(report.some(x=>x.failures.length)||intentFailures.length||contractReport.some(x=>x.failures.length)) process.exitCode=1;

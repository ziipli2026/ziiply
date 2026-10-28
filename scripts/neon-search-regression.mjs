#!/usr/bin/env node
// Read-only live regression checks. Exit nonzero on relevance regressions.
const base = process.env.SEARCH_BASE_URL || 'https://ziiply-jvk6qfcrp-ziipli2026s-projects.vercel.app';
const cases = [
  {q:'maito', positive:/\b(maito|kevytmaito|täysmaito|maitojuoma)\b/i, negative:/juusto|margariini|maitohappobakteeri|koiranruoka/i},
  {q:'peruna', positive:/\bperuna\b|\bperunat\b/i, negative:/koiranruoka|perunavuoka|perunamuusi|kermaperuna|peruna-sipulisekoitus/i},
  {q:'kahvi', positive:/kahvi/i, negative:/kahvinkeitin|kahvikuppi|kahvinsuodatin/i},
  {q:'jauheliha', positive:/jauheliha/i, negative:/koiranruoka|kastike|pizza/i},
  {q:'banaani', positive:/banaani/i, negative:/koiranruoka|jogurtti|mehu/i},
  {q:'olut', positive:/olut|lager|pils/i, negative:/oluthiiva|olutlasi/i},
  {q:'laktoositon maito', positive:/maito/i, negative:/juusto|margariini/i},
  {q:'Valio', positive:/valio/i, negative:/^$/},
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
const fs=await import('node:fs');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/neon-search-regression.json',JSON.stringify({base,at:new Date().toISOString(),report},null,2));
for(const r of report) console.log((r.failures.length?'FAIL':'PASS')+' '+r.query+' '+r.ms+'ms '+r.failures.join(', '));
if(report.some(x=>x.failures.length)) process.exitCode=1;

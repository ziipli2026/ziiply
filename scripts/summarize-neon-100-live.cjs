const fs=require('node:fs');
const reports=fs.readdirSync('.').filter(p=>/^neon-100-live-\d+\.json$/.test(p)).map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const results=reports.flatMap(r=>r.results).sort((a,b)=>a.query.localeCompare(b.query,'fi'));
const complete=results.length===100&&new Set(results.map(r=>r.query)).size===100;
const failures=results.filter(r=>r.errors.length);
const rawSuspects=results.reduce((n,r)=>n+(r.raw?.suspects.length||0),0);
const lines=['# 100 grocery query live audit','',`Target: ${reports[0]?.target||'missing'}`,`Queries: ${results.length}/100; failing queries: ${failures.length}; original raw suspect records: ${rawSuspects}.`,'','Original raw catalog matches may be broad and unpriced. Desktop catalog matches must be relevant; final normal results must be relevant, priced and sorted by ascending purchase price. This executes the actual checked-out desktop handler with live HTTP responses; it does not automate the rendered browser.','','| Query | Raw | Desktop Neon | Visible priced | Raw suspects | Errors |','|---|---:|---:|---:|---:|---|',...results.map(r=>`| ${r.query} | ${r.raw?.count??'-'} | ${r.desktop?.count??'-'} | ${r.visible?.count??'-'} | ${r.raw?.suspects.length??'-'} | ${r.errors.join('; ')||'-'} |`)];
for(const r of failures){lines.push('',`## ${r.query}`,...[...(r.desktop?.suspects||[]),...(r.visible?.suspects||[])].map(p=>`- ${p.name}: ${p.reason}`));}
const text=lines.join('\n')+'\n';fs.writeFileSync('neon-100-summary.md',text);console.log(text);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,text);
if(!complete||failures.length)process.exitCode=1;

import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder=process.argv[2]||'47lv-fresh';
const source=JSON.parse(fs.readFileSync(folder+'/parser-evidence.json'));
const fresh=JSON.parse(fs.readFileSync(folder+'/leaflet.json'));
const old=JSON.parse(fs.readFileSync('tests/fixtures/citymarket/47lv-neon-candidate.json'));
const norm=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const oldByTitle=new Map(old.map(x=>[norm(x.title),x]));
const freshRows=source.rows.map(x=>({page:x.page,title:x.title,rawPrice:x.spatialResolved?.value??null,percentage:x.percentageOffer?.percent??null,nearby:x.nearby,spatialResolved:x.spatialResolved,flags:x.debugSuspiciousPublisherTitle}));
const matches=freshRows.filter(x=>oldByTitle.has(norm(x.title))).map(x=>({page:x.page,title:x.title,rawPrice:x.rawPrice,previousPrice:oldByTitle.get(norm(x.title)).price,previousUnitPrice:oldByTitle.get(norm(x.title)).unitPrice}));
const unmatchedOld=old.filter(x=>!freshRows.some(y=>norm(y.title)===norm(x.title))).map(x=>({title:x.title,price:x.price,category:x.category}));
const suspicious=freshRows.filter(x=>x.flags||!x.title||Number(x.rawPrice)>50||/^(?:TUOTTEET|ULKOFILEESTÄ|NAUDAN LEHTIPIHVI|NAUGHTY BURGER)/i.test(x.title));
const report={sourcePdfSha256:fresh.pdfSha256,pageCount:fresh.pageCount,rawRows:freshRows.length,exportedRows:fresh.rows.length,previousApprovedRows:old.length,exactTitleMatches:matches.length,unmatchedOld,suspicious,matchedRows:matches,rawRowsByPage:Object.fromEntries([...new Set(freshRows.map(x=>x.page))].map(p=>[p,freshRows.filter(x=>x.page===p).length]))};
fs.writeFileSync(folder+'/old-vs-fresh-audit.json',JSON.stringify(report,null,2));
console.log('FRESH_47LV_AUDIT',JSON.stringify({pdfSha256:report.sourcePdfSha256,pages:report.pageCount,raw:report.rawRows,exported:report.exportedRows,old:report.previousApprovedRows,exactMatches:report.exactTitleMatches,unmatchedOld:report.unmatchedOld.length,suspicious:report.suspicious.length}));
console.log('FRESH_47LV_UNMATCHED_OLD',JSON.stringify(unmatchedOld));
console.log('FRESH_47LV_SUSPICIOUS',JSON.stringify(suspicious.map(x=>({page:x.page,title:x.title,rawPrice:x.rawPrice,flags:x.flags}))));
console.log('FRESH_47LV_PRICE_DIFFS',JSON.stringify(matches.filter(x=>x.rawPrice!=null&&x.previousPrice!=null&&Math.abs(Number(x.rawPrice)-Number(x.previousPrice))>0.01)));
if(fresh.pageCount!==20||fresh.pdfSha256!=='3d0769f7ec3c3944163d694abdda85227a70fd33574b015209055af5abc45449')throw Error('Original 47LV PDF changed; stop comparison');

// Verify raw parser rows against the independently read printed cards.
const expectedCards=[
 [15,'PUNAKAALI',0.99,null,'KG'],
 [15,'CELINA PÄÄRYNÄ',2.99,null,'KG'],
 [15,'ROSMARIINI',2.99,null,'KPL'],
 [15,'JUICY SALAATTI 125 g',1.49,null,'PS'],
 [16,'PROTEIN RAHKAT 200 g',3.50,4,'PRK'],
 [16,'ACTIMEL JOGURTTIJUOMAT 8 x 100 g',3.69,null,'PKT'],
 [16,'KASVIVOIMAA LEVITTEET 400 g',5.20,2,'RS'],
];
for(const [page,title,price,quantity,unit] of expectedCards){
 const matches=source.rows.filter(row=>row.page===page&&row.title.includes(title));
 assert.equal(matches.length,1,'Expected one source card for '+title);
 const proof=matches[0].spatialResolved;
 assert.equal(proof?.source,'publisher-aligned-price-cards',title);
 assert.deepEqual([proof.value,proof.quantity,proof.unit],[price,quantity,unit],title);
}
assert.ok(!source.rows.some(row=>/KOPIERINGSPAPPER|JUOMALASI|PUNAKAALI.*PÄÄRYNÄ|JOGURTTIJUOMAT.*PROTEIN RAHKAT/i.test(row.title)),
 'Non-grocery or mixed-card rows must be absent from parser output');

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
 [18,'Snellman NAUDAN LEHTIPIHVI ULKOFILEESTÄ tai MUREUTETTU ULKOFILEEPIHVI 2 kpl/240 g',10.99,null,'RS'],
 [18,'Vaasan THE BRGR NAUGHTY BURGER 4 kpl/320 g',2.39,null,'PS'],
];
for(const [page,title,price,quantity,unit] of expectedCards){
 const matches=source.rows.filter(row=>row.page===page&&row.title.includes(title));
 assert.equal(matches.length,1,'Expected one source card for '+title);
 const proof=matches[0].spatialResolved;
 assert.equal(proof?.source,'publisher-aligned-price-cards',title);
 assert.deepEqual([proof.value,proof.quantity,proof.unit],[price,quantity,unit],title);
}
assert.ok(!source.rows.some(row=>/KOPIERINGSPAPPER|JUOMALASI|PUNAKAALI.*PÄÄRYNÄ|JOGURTTIJUOMAT.*PROTEIN RAHKAT|ULKOFILEEPIHVI.*BURGER|^NAUDAN LEHTIPIHVI$|^ULKOFILEESTÄ tai MUREUTETTU$/i.test(row.title)),
 'Non-grocery or mixed-card rows must be absent from parser output');

const bottle=source.rows.filter(row=>row.page===16&&/^TÄYSMEHUT 900 ml\/pl tai SMOOTHIET 750 ml\/pl/.test(row.title));
assert.equal(bottle.length,1);
assert.deepEqual(bottle.map(row=>[row.spatialResolved?.value,row.spatialResolved?.unit,row.spatialResolved?.source]),
 [[3.49,'PL','owned-printed-split-euro-cents']]);

const mulledWine=source.rows.filter(row=>row.page===20&&/^GLÖGI 8 % 0,75 l\/pl/.test(row.title));
assert.equal(mulledWine.length,1);
assert.deepEqual(mulledWine.map(row=>[row.spatialResolved?.value,row.spatialResolved?.unit,row.spatialResolved?.source]),
 [[9.29,'PL','owned-printed-overlaid-heading-price']]);

const skinCare=source.rows.filter(row=>row.page===13&&/SMUUTI|COSRX/i.test(row.title));
assert.deepEqual(skinCare.map(row=>[row.title,row.percentageOffer?.percent]),
 [['SMUUTI SKIN -IHONHOITOTUOTTEET ja COSRX-TUOTTEET (ei lahjapakkaukset)',25]]);

const cheese=source.rows.filter(row=>row.page===18&&/JUUSTOVIIPALEET/.test(row.title));
assert.deepEqual(cheese.map(row=>[row.title,row.spatialResolved?.value,row.spatialResolved?.unit]),
 [['Kuusamon Juusto NAUGHTY BURGER JUUSTOVIIPALEET 120–200 g',2.99,'PKT']]);
assert.ok(!source.rows.some(row=>row.page===18&&row.title==='NAUGHTY BURGER'));

const hairCare=source.rows.filter(row=>row.page===13&&row.title==='HIUSTENHOITOTUOTTEET 100–300 ml');
assert.deepEqual(hairCare.map(row=>[row.spatialResolved?.value,row.spatialResolved?.quantity,row.spatialResolved?.unit,row.spatialResolved?.source]),
 [[10.90,2,'KPL','owned-printed-fused-count-and-price']]);

const cover=source.rows.filter(row=>row.page===1&&/PERSIMON|KASSLER|Coca-Cola/.test(row.title));
assert.deepEqual(cover.map(row=>[row.title,row.spatialResolved?.value,row.spatialResolved?.quantity,row.spatialResolved?.unit,row.spatialResolved?.depositTotal??null]),[
 ['Coca-Cola Zero Sugar, Sprite Zero Sugar ja Fanta Zero Sugar VIRVOITUSJUOMAT 0,33 l/tlk 6-pack',7,2,'6-PACK',1.80],
 ['PERSIMON Espanja',2.49,null,'KG',null],
 ['Kivikylän PORSAAN KASSLER n. 1 kg',5.99,null,'KG',null],
]);

const tortillas=source.rows.filter(row=>row.page===17&&/^T.?ORTILLA /.test(row.title));
assert.deepEqual(tortillas.map(row=>[row.title,row.spatialResolved?.value,row.spatialResolved?.unit]),[
 ['TORTILLA CHIPSIT 160–185 g (7,51–8,69/kg)',1.39,'PS'],
 ['TORTILLA ORIGINAL MEDIUM 320 g (3,59/kg)',1.15,'PKT'],
]);

const drinks=source.rows.filter(row=>row.page===20&&/SPRITZIT|RADLER|^vadelmainen/.test(row.title));
assert.deepEqual(drinks.map(row=>[row.title,row.spatialResolved?.value,row.spatialResolved?.quantity,row.spatialResolved?.unit,row.spatialResolved?.depositTotal]),[
 ['Kåska SELVIN PÄIN SPRITZIT 0 % 0,33 l/tlk',4.70,2,'TLK',.30],
 ['Crisp RADLER ALKOHOLITTOMAT OLUET 0,0 % 0,33 l/tlk',3,2,'TLK',.30],
]);

const skinCarePrice=source.rows.filter(row=>row.page===13&&/VOITEET 50 ml sekä MEIKINPOISTOAINE 125 ml/.test(row.title));
assert.deepEqual(skinCarePrice.map(row=>[row.title,row.spatialResolved?.value,row.spatialResolved?.unit,row.percentageOffer]),[
 ['Triple Active Hyaluron Expert ja Collagen Expert VOITEET 50 ml sekä MEIKINPOISTOAINE 125 ml',5,'KPL',null],
]);

const dental=source.rows.filter(row=>row.page===13&&/HAMMASTAHNARASIAT|^4 kpl\/pkt, LASTEN|^SUIHKU- ja NESTE-/.test(row.title));
assert.equal(dental.length,1);
assert.match(dental[0].title,/^Colgate .* tai Palmolive .*500 ml$/);
assert.deepEqual([dental[0].spatialResolved?.value,dental[0].spatialResolved?.quantity,dental[0].spatialResolved?.unit],[10,4,'KPL']);

// Reviewed title differences pair source cards for the audit only.
const titlePairs=[
 ['L’ORÉAL PARIS MEIKKIVOITEET','L’ORÉAL PARIS MEIKKIVOITEET',2],
 ['Rexona ja Rexona Men','RANTIT 45 ml',13],
 ['Innocent TÄYSMEHUT','TÄYSMEHUT 900 ml',16],
 ['TORTILLA ORIGINAL MEDIUM','TORTILLA ORIGINAL MEDIUM',17],
 ['Naughty HOT DOG MAKKARAT','H3O T D O G MAKKARAT',18],
 ['Vaasan THE DOG','THE DOG NAUGHTY HOT DOG',18],
 ['Pokemon ja Dolci','JOULUKALENTERI 200 g',19],
 ['Kinder MAXI MIX','JOULUKALENTERI 351 g',19],
 ['Haribo JOULUKALENTERI','H9aribo JOULUKALENTERI',19],
 ['After Eight, KitKat','JOULUKALENTERI 189–208 g',19],
 ['Lindt TEDDY','TEDDY JOULUKALENTERI',19],
 ['ALKOHOLITON GLÖGI','A4LKOHOLITON GLÖGI',20],
 ['CHARDONNAY tai CABERNET','C8HARDONNAY tai CABERNET',20],
 ['Colgate HAMMASTAHNARASIAT','Colgate HAMMASTAHNARASIAT',13],
 ['L’Oréal Paris Triple Active','Triple Active Hyaluron',13],
];
const sourceUnits=[
 [/^TORTILLA ORIGINAL MEDIUM/,'PS','PKT'],
 [/^Eleplant KASVIVOIMAA/,'PKT','RS'],
 [/^Kuusamon Juusto NAUGHTY BURGER/,'KPL','PKT'],
];
const matchedCards=new Set();
const reconciled=old.map(expected=>{
 const exact=source.rows.filter(row=>norm(row.title)===norm(expected.title));
 const pair=titlePairs.find(([prefix])=>expected.title.startsWith(prefix));
 const candidates=exact.length?exact:pair?source.rows.filter(row=>row.page===pair[2]&&row.title.startsWith(pair[1])):[];
 assert.equal(candidates.length,1,expected.title);
 const [row]=candidates;
 assert.ok(!matchedCards.has(row),row.title);
 matchedCards.add(row);
 const offer=row.spatialResolved;
 assert.equal(offer?.value??null,expected.price,expected.title);
 assert.equal(offer?.quantity??1,expected.offerQuantity??1,expected.title);
 assert.equal(row.percentageOffer?.percent??null,expected.discountPercent??null,expected.title);
 const corrected=sourceUnits.find(([pattern])=>pattern.test(expected.title));
 if(corrected)assert.equal(expected.offerUnit,corrected[1],expected.title);
 if(expected.offerUnit)assert.equal(offer?.unit,corrected?.[2]??expected.offerUnit,expected.title);
 return {page:row.page,referenceTitle:expected.title,sourceTitle:row.title,price:offer?.value??null,
  quantity:offer?.quantity??null,unit:offer?.unit??null,discountPercent:row.percentageOffer?.percent??null,
  ...(corrected?{referenceUnit:corrected[1]}:{})};
});
assert.equal(matchedCards.size,source.rows.length,'Every raw row must match one reviewed card');
fs.writeFileSync(folder+'/reconciled-offers.json',JSON.stringify(reconciled,null,2));
console.log('FRESH_47LV_RECONCILED',JSON.stringify({offers:reconciled.length,titleDifferences:unmatchedOld.length,correctedUnits:sourceUnits.length}));

import fs from 'node:fs';
import path from 'node:path';
const dir=process.argv[2];
if(!dir)throw Error('Usage: node scripts/citymarket/audit-47lv-capture.mjs CAPTURE_FOLDER');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'archive-manifest.json'),'utf8'));
const evidence=JSON.parse(fs.readFileSync(path.join(dir,'parser-evidence.json'),'utf8'));
const exported=JSON.parse(fs.readFileSync(path.join(dir,'leaflet.json'),'utf8'));
if(!String(manifest.publisherUrl).includes('_47LV_KCM'))throw Error('Not 47LV source');
const problems=[];
for(const row of evidence.rows||[]){
 const title=String(row.title||'');
 const value=Number(row.spatialResolved?.value);
 if(row.page===20 && /^G9LÖGI 8 %/.test(title) && value>20)problems.push({page:row.page,title,rawPrice:value,reason:'implausible-price-glyph; provider override must be checked'});
 if(/^(?:TUOTTEET ja COSRX-TUOTTEET|ULKOFILEESTÄ tai MUREUTETTU|NAUDAN LEHTIPIHVI|NAUGHTY BURGER)$/.test(title))problems.push({page:row.page,title,rawPrice:value||null,reason:'orphan/merged product heading'});
 if(row.debugSuspiciousPublisherTitle?.reason==='merged-publisher-product-headings')problems.push({page:row.page,title,reason:'parser-reported merged heading'});
}
const report={issue:'47LV',sourceRows:evidence.rows?.length||0,exportedRows:exported.rows?.length||0,pdfSha256:manifest.pdfSha256,problems};
fs.writeFileSync(path.join(dir,'47lv-quality-report.json'),JSON.stringify(report,null,2));
console.log('KCM_47LV_QUALITY_REPORT',JSON.stringify(report));
if(problems.length){console.error('47LV raw capture has unresolved evidence; NOT approved:',problems.length);process.exitCode=1;}

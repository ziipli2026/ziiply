import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [folder,fixturePath,parserPath='src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js']=process.argv.slice(2);
if(!folder||!fixturePath)throw Error('Usage: replay-frozen-parser.mjs archive-folder approved-fixture [parser-path]');
const frozen=JSON.parse(fs.readFileSync(path.join(folder,'publisher-responses.json'),'utf8'));
if(!frozen.entry||!frozen.responses||!Object.keys(frozen.responses).length)throw Error('Missing frozen publisher responses');
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
console.log('KCM_FROZEN_ENTRY',JSON.stringify({entry:frozen.entry,sourceUrl:fixture.sourceUrl}));
const {parseKCitymarketSpatialLeaflet}=await import(pathToFileURL(path.resolve(parserPath)));
const visited=new Set();
const missingRequests=[];
globalThis.fetch=async input=>{
 const url=String(input instanceof URL?input.href:input);
 const item=frozen.responses[url];
 if(!item){missingRequests.push(url);throw Error('Offline publisher response missing: '+url);}
 visited.add(url);
 return {ok:true,status:200,url:item.url,text:async()=>item.body};
};
let parsed;
try{parsed=await parseKCitymarketSpatialLeaflet(frozen.entry);}catch(error){
 const failure={id:fixture.id,error:String(error?.stack||error),requests:visited.size,missingRequests};
 if(process.env.KCM_REPLAY_REPORT)fs.writeFileSync(process.env.KCM_REPLAY_REPORT,JSON.stringify(failure,null,2)+'\n');
 console.error('KCM_REPLAY_FAILED',JSON.stringify(failure));
 process.exit(1);
}
if(!Array.isArray(parsed?.rows)){
 const failure={id:fixture.id,error:'Parser did not return rows',requests:visited.size,missingRequests};
 if(process.env.KCM_REPLAY_REPORT)fs.writeFileSync(process.env.KCM_REPLAY_REPORT,JSON.stringify(failure,null,2)+'\n');
 console.error('KCM_REPLAY_FAILED',JSON.stringify(failure));
 process.exit(1);
}
const extractedKeys=parsed.rows.flatMap(r=>{
 const title=String(r.title||'').trim().toLowerCase(),page=Number(r.page)||0;
 const resolved=r.spatialResolved;
 if(resolved&&!resolved.displayOnlyUnitPrice&&Number(resolved.value)>0)return [`kcm:spatial:${page}:${title}:${Number(resolved.value)}`];
 const percent=Number(r.percentageOffer?.percent);
 return !resolved&&percent>0&&percent<100?[`kcm:spatial:${page}:${title}:percent:${percent}`]:[];
});
const keys=new Set(extractedKeys);
const duplicateKeys=extractedKeys.length-keys.size;
const expected=new Set(fixture.offers.map(x=>x.key));
const missing=[...expected].filter(k=>!keys.has(k));
const extra=[...keys].filter(k=>!expected.has(k));
const targets=new Set(missing.map(k=>k.split(':').slice(0,4).join(':')));
for(const row of parsed.rows){
 const title=String(row.title||'').trim().toLowerCase(),prefix='kcm:spatial:'+Number(row.page)+':'+title;
 if(targets.has(prefix))console.log('KCM_MISSING_ROW_DIAGNOSTIC',JSON.stringify({page:row.page,title:row.title,spatialResolved:row.spatialResolved,initialExpectedSingle:row.initialExpectedSingle,expectedSingle:row.expectedSingle,debugRejectedFinalBundle:row.debugRejectedFinalBundle,debugRejectedCardPrice:row.debugRejectedCardPrice,debugCardPrice:row.debugCardPrice,spatialCandidates:row.spatialCandidates}));
}
const wcPaperDiagnostics=parsed.rows.filter(r=>Number(r.page)===1||Number(r.page)===5).filter(r=>/WC-PAPERI/i.test(String(r.title||''))).map(r=>({page:r.page,title:r.title,price:r.spatialResolved?.value??null,quantity:r.spatialResolved?.quantity??null,rejectedCandidate:!!r.debugRejectedCardPrice}));
const wcPaperFailures=[];
const wcPaperCases={'1:40':0,'5:6':0,'5:40':0};
for(const row of parsed.rows){
 const page=Number(row.page),title=String(row.title||'').toUpperCase();
 if(![1,5].includes(page)||!/WC[-\s]?PAPERI/.test(title))continue;
 const resolved=row.spatialResolved;
 const rolls=/\b(40|6)\s*RL\b/.exec(title)?.[1];
 const caseId=page+':'+rolls;
 if(Object.hasOwn(wcPaperCases,caseId))wcPaperCases[caseId]++;
 if(page===1&&/40\s*RL/.test(title)&&resolved?.value>0)wcPaperFailures.push({page,title,reason:'Unexpected price for page 1 WC paper',value:resolved.value});
 if(page===5&&/6\s*RL/.test(title)&&resolved?.value>0)wcPaperFailures.push({page,title,reason:'Unexpected price for page 5 six-roll WC paper',value:resolved.value});
 if(page===5&&/40\s*RL/.test(title)&&(!resolved||Math.abs(Number(resolved.value)-29.9)>.001||Number(resolved.quantity)!==2))wcPaperFailures.push({page,title,reason:'Expected 29.90 EUR for two 40-roll packs',resolved:resolved||null});
}
for(const [caseId,count] of Object.entries(wcPaperCases))if(count!==1)wcPaperFailures.push({caseId,reason:'Expected exactly one matching archived WC-paper row',count});
const report={id:fixture.id,requests:visited.size,missingRequests,pages:parsed.pageCount,expected:expected.size,matched:expected.size-missing.length,missing,extra,duplicateKeys,wcPaperDiagnostics,wcPaperCases,wcPaperFailures,fixtureSha256:createHash('sha256').update(fs.readFileSync(fixturePath)).digest('hex')};
const reportPath=process.env.KCM_REPLAY_REPORT;
if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('KCM_REPLAY',JSON.stringify(report));
if(parsed.pageCount!==fixture.pageCount||missing.length||extra.length||duplicateKeys||missingRequests.length||wcPaperFailures.length)process.exitCode=1;

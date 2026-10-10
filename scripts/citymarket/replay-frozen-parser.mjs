import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [folder,fixturePath,parserPath='src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js']=process.argv.slice(2);
if(!folder||!fixturePath)throw Error('Usage: replay-frozen-parser.mjs archive-folder approved-fixture [parser-path]');
const frozen=JSON.parse(fs.readFileSync(path.join(folder,'publisher-responses.json'),'utf8'));
if(!frozen.entry||!frozen.responses||!Object.keys(frozen.responses).length)throw Error('Missing frozen publisher responses');
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const {parseKCitymarketSpatialLeaflet}=await import(pathToFileURL(path.resolve(parserPath)));
const visited=new Set();
globalThis.fetch=async input=>{
 const url=String(input instanceof URL?input.href:input);
 const item=frozen.responses[url];
 if(!item)throw Error('Offline publisher response missing: '+url);
 visited.add(url);
 return {ok:true,status:200,url:item.url,text:async()=>item.body};
};
const parsed=await parseKCitymarketSpatialLeaflet(frozen.entry);
const keys=new Set(parsed.rows.flatMap(r=>{
 const title=String(r.title||'').trim().toLowerCase(),page=Number(r.page)||0;
 const resolved=r.spatialResolved;
 if(resolved&&!resolved.displayOnlyUnitPrice&&Number(resolved.value)>0)return [`kcm:spatial:${page}:${title}:${Number(resolved.value)}`];
 const percent=Number(r.percentageOffer?.percent);
 return !resolved&&percent>0&&percent<100?[`kcm:spatial:${page}:${title}:percent:${percent}`]:[];
}));
const expected=new Set(fixture.offers.map(x=>x.key));
const missing=[...expected].filter(k=>!keys.has(k));
const extra=[...keys].filter(k=>!expected.has(k));
const targets=new Set(missing.map(k=>k.split(':').slice(0,4).join(':')));
for(const row of parsed.rows){
 const title=String(row.title||'').trim().toLowerCase(),prefix='kcm:spatial:'+Number(row.page)+':'+title;
 if(targets.has(prefix))console.log('KCM_MISSING_ROW_DIAGNOSTIC',JSON.stringify({page:row.page,title:row.title,spatialResolved:row.spatialResolved,initialExpectedSingle:row.initialExpectedSingle,expectedSingle:row.expectedSingle,debugRejectedFinalBundle:row.debugRejectedFinalBundle,debugRejectedCardPrice:row.debugRejectedCardPrice,debugCardPrice:row.debugCardPrice,spatialCandidates:row.spatialCandidates}));
}
console.log('KCM_REPLAY',JSON.stringify({id:fixture.id,requests:visited.size,pages:parsed.pageCount,expected:expected.size,matched:expected.size-missing.length,missing,extra}));
if(parsed.pageCount!==fixture.pageCount||missing.length||extra.length)process.exitCode=1;

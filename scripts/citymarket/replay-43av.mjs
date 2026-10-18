import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
const frozen=JSON.parse(fs.readFileSync('/tmp/43av-responses.json','utf8'));
const get=async url=>{
 const key=String(url);
 const hit=frozen.responses[key];
 if(!hit)throw Error('Unarchived publisher request: '+key);
 return {ok:true,status:hit.status||200,url:hit.url||key,text:async()=>hit.body};
};
const parsed=await parseKCitymarketSpatialLeaflet(frozen.entry,get);
fs.writeFileSync('/tmp/43av-replayed.json',JSON.stringify(parsed));
console.log('43AV replay:',parsed.rows.length,'rows',parsed.pageCount,'pages');

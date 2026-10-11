import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectNational,persistNational,TEST_BRANCH} from '../scripts/lib/tankkaus-national.mjs';
const row=(id=1,extra={})=>({id,station_id:id,fuel_type_id:1,price_liter:'1.899',created:'2020-01-01T00:00:00.123456+03:00',station:{id,name:'Asema',latitude:'60.633',longitude:'24.866',chain:{name:'ABC'},country:{name_short:'FI'}},...extra});
const feed=(pages,requests=[])=>async(url,options)=>{requests.push({url,options});const page=Number(new URL(url).searchParams.get('page'));return {ok:true,status:200,json:async()=>({fills:pages[page-1]??[]})};};
test('collects every page, preserves original timestamp precision and accepts distant stations',async()=>{
 const requests=[];const result=await collectNational({token:'test-token',fetchImpl:feed([Array.from({length:100},(_,i)=>row(i+1)),[row(101,{station:{...row(101).station,latitude:'69.5'}})]],requests)});
 assert.equal(result.observations.length,101);assert.equal(result.stations.length,101);assert.equal(requests.length,3);assert.equal(result.observations[0].observedAt,'2020-01-01T00:00:00.123456+03:00');
 assert(requests.every(r=>r.options.headers.Authorization==='Token test-token'));assert(!JSON.stringify(result).includes('test-token'));assert.equal(result.report.stationRegistryComplete,false);
});
test('rejects unsupported, foreign, Teboil, invalid price, timezone-free and future rows with counts',async()=>{
 const batch=await collectNational({token:'x',fetchImpl:feed([[row(1),row(2,{fuel_type_id:99}),row(3,{station:{...row(3).station,country:{name_short:'SE'}}}),row(4,{station:{...row(4).station,name:'Teboil'}}),row(5,{price_liter:null}),row(6,{created:'2020-01-01T00:00:00'}),row(7,{created:'2099-01-01T00:00:00Z'})]])});
 assert.equal(batch.observations.length,1);assert.equal(batch.report.rejected.unsupportedFuel,1);assert.equal(batch.report.rejected.nonFinnish,1);assert.equal(batch.report.rejected.teboil,1);assert.equal(batch.report.rejected.invalidPrice,1);assert.equal(batch.report.rejected.invalidTimestamp,2);
});
test('404 is exhaustion only after the first page; repeated pages and midstream failures abort',async()=>{
 const first=feed([[row()]]);const r=await collectNational({token:'x',fetchImpl:async(url,options)=>url.includes('page=1&')?first(url,options):{ok:false,status:404}});assert.equal(r.observations.length,1);
 await assert.rejects(collectNational({token:'x',fetchImpl:async()=>({ok:false,status:404})}),/HTTP 404/);
 await assert.rejects(collectNational({token:'x',fetchImpl:async()=>({ok:true,status:200,json:async()=>({fills:[row()]})})}),/repeated/);
 await assert.rejects(collectNational({token:'x',fetchImpl:async(url,options)=>url.includes('page=1&')?first(url,options):{ok:false,status:503}}),/HTTP 503/);
});
test('database branch guard refuses production before transaction',async()=>{
 let transactions=0;const sql=async()=>[{branch_id:'br-production'}];sql.transaction=()=>transactions++;
 await assert.rejects(persistNational(sql,{stations:[],observations:[row()]}),/Refusing/);assert.equal(transactions,0);
});
test('test-branch writes are atomic, append-only and use provider timestamp',async()=>{
 const statements=[];const sql=(parts,...values)=>{const text=parts.join('?');statements.push({text,values});return text.startsWith('SELECT current_setting')?Promise.resolve([{branch_id:TEST_BRANCH}]):{text,values};};
 sql.transaction=async queries=>{assert.equal(queries.length,3);assert(queries[1].text.includes('DO NOTHING'));assert(queries[1].values[0].includes('2020-01-01T00:00:00.123456+03:00'));return [[{source_station_id:1}],[{id:1}],[{source_observation_id:1}]];};
 const batch=await collectNational({token:'x',fetchImpl:feed([[row()]])});assert.deepEqual(await persistNational(sql,batch),{upsertedStations:1,insertedObservations:1,insertedRawObservations:1});
});
test('raw archive retains valid observations for other fuels and missing coordinates',async()=>{
 const batch=await collectNational({token:'x',fetchImpl:feed([[row(1,{fuel_type_id:99}),row(2,{station:{...row(2).station,latitude:null}})]])});
 assert.equal(batch.rawObservations.length,2);assert.equal(batch.observations.length,0);assert.equal(batch.rawObservations[0].fuelTypeId,99);
});

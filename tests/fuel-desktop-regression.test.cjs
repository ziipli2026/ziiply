const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const desktop = fs.readFileSync('src/app/desktop-preview/page.tsx','utf8');
const route = fs.readFileSync('src/app/api/fuel/stations/route.ts','utf8');
for (const [name,text] of [['page.tsx',desktop],['route.ts',route]]) {
 const ast=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,JSON.stringify(ast.parseDiagnostics.map(d=>({name,start:d.start,message:d.messageText}))));
}
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
const uploaded={stations:[{id:'81',name:'Keskusta',chain:'St1',address:'Sillankorvankatu 1',latitude:60.6283634,longitude:24.8642335,isTrafficStation:false},{id:'399',name:'Sveitsinportti',chain:'Neste Oil Express',address:'Helletorpankatu 1',latitude:60.619833,longitude:24.8180233,isTrafficStation:false,price98:2.35,observed98:'2026-10-10T05:33:09.000Z'},{id:'55',name:'Muu asema',chain:'SEO',latitude:60.7158,longitude:24.8028,isTrafficStation:null},{id:'999',name:'Pohjoinen',chain:'Neste',latitude:69.5,longitude:27,isTrafficStation:null},{id:'2391',name:'Ruotsi',chain:'-',latitude:0,longitude:0,isTrafficStation:null}]};
const rows=uploaded.stations.map(s=>({...s,source_station_id:s.id,is_traffic_station:s.isTrafficStation,traffic_station_verified:s.isTrafficStation!==null,observed_diesel:s.observedDiesel}));
rows.push({...rows[0],source_station_id:100000,name:'Foreign station',country_id:'2'});
rows.push({...rows[0],source_station_id:100001,name:'Teboil test',chain:'Teboil'});
rows.push({...rows[0],source_station_id:100002,is_traffic_station:true,traffic_station_verified:true});
const sql=async strings=>strings.join('').includes('current_setting')?[{branch_id:'br-weathered-meadow-b1bwpzst'}]:rows;
const sandbox={exports:{},process:{env:{VERCEL_ENV:'preview',TANKKAUS_TEST_DATABASE_URL:'mock-test-only'}},require:id=>id==='next/server'?{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}}:id==='@neondatabase/serverless'?{neon:()=>sql}:require(id)};
vm.runInNewContext(compile(route),sandbox);
(async()=>{
 const result=await sandbox.exports.GET({nextUrl:new URL('https://test/api/fuel/stations?lat=60.633&lon=24.866')});
 assert.equal(result.status,200);
 const stations=result.body.stations;
 assert.equal(stations.length,4);
 assert(stations.every(s=>typeof s.isTrafficStation==='boolean'));
 assert(!stations.some(s=>s.name==='Ruotsi'||s.name==='Foreign station'||/teboil/i.test(s.name)));
 assert(stations.every((s,i)=>!i||stations[i-1].distanceKm<=s.distanceKm));
 assert(stations.at(-1).distanceKm>500,'no user-radius restriction');
 assert.equal(stations.find(s=>s.id==='81').isTrafficStation,true,'traffic duplicate survives');
 assert.equal(stations.find(s=>s.id==='399').price98,2.35);
 assert.equal(stations.find(s=>s.id==='399').observed98,'2026-10-10T05:33:09.000Z');
 const helpers=desktop.split('\n').filter(l=>/^  const fuel(Candidates|GroupOf|IsTraffic|Visible)=/.test(l)).join('\n');
 const helperContext={fuelStations:stations,fuelStationSide:'cold',fuelGroups:['Neste','ABC','St1','SEO','Gulf','Ritoil','Muut']};
 vm.runInNewContext(compile(helpers+'\nresult={fuelVisible,fuelCandidates};'),helperContext);
 assert.equal(helperContext.result.fuelVisible.length,stations.filter(s=>s.isTrafficStation!==true).length);
 assert(helperContext.result.fuelCandidates('Neste').some(s=>s.id==='399'));
 const component=desktop.slice(desktop.indexOf('function FuelStationCardDetails('),desktop.indexOf('\nfunction FuelStationBackdrop'));
 const ctx={React};vm.runInNewContext(compile(component+'\nCard=FuelStationCardDetails;'),ctx);
 const markup=renderToStaticMarkup(React.createElement(ctx.Card,{chain:'Neste',station:stations.find(s=>s.id==='399')}));
 assert(markup.includes('2,350'));assert(markup.includes('DI'));assert(markup.includes('BE'));
 assert(markup.includes('–'));assert(markup.includes('w-14'));assert(!markup.includes('10.10.'));

 console.log(JSON.stringify({ok:true,stations:stations.length,cold:helperContext.result.fuelVisible.length,checks:['TSX/TS syntax','Hyvinkää regression fixture','Finland/country/Teboil filtering','boolean classification','traffic duplicate','GPS ordering without radius','Sveitsinportti price and timestamp','cold filter','card rendering']}));
})().catch(e=>{console.error(e);process.exitCode=1});

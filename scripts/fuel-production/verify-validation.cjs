const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {neon,neonConfig}=require('@neondatabase/serverless');
neonConfig.fetchFunction=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(30000)});
async function verify(config,branch){
 const sql=neon(config.target);const [identity]=await sql`SELECT current_setting('neon.branch_id',true) AS branch`;
 assert.equal(identity.branch,branch);assert.notEqual(branch,'br-lucky-fog-b1hwz641','Validation script must not write to live production');
 const load=path=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,process:{env:{}},URL,Date,require(name){
  if(name.endsWith('/fuelDatabase'))return {fuelDatabaseConfig:()=>({production:true,connection:config.target,expectedBranch:branch})};
  if(name.endsWith('/fuelPhoto'))return load('src/lib/fuelPhoto.ts');
  if(name==='@neondatabase/serverless')return {neon};
  if(name==='next/server')return {NextResponse:{json:(body,init)=>({body,status:init?.status??200})}};
  throw Error(name);
 }});return exports;};
 const response=await load('src/app/api/fuel/stations/route.ts').GET({nextUrl:new URL('https://ziiply.vercel.app/api/fuel/stations?lat=60.4939&lon=25.5413944444')});
 assert.equal(response.status,200);assert.equal(response.body.total,1326);assert.equal(response.body.stations[0].name,'ABC Sale Monninkylä');assert.ok(response.body.stations[0].distanceKm<.04);
 const [r]=await sql`SELECT * FROM ziiply_user_fuel_reports WHERE id='c7d664a0-c0ab-4a0e-8d73-3e1f15db8041'::uuid`;
 const body={id:r.id,stationId:String(r.source_station_id),prices:r.prices,photo:r.photo_data_url,observedAt:r.observed_at,gps:{lat:r.gps_latitude,lon:r.gps_longitude,accuracy:r.gps_accuracy_m},...r.metadata,confirmed:true};
 const result=await load('src/app/api/fuel/reports/route.ts').POST({nextUrl:new URL('https://ziiply.vercel.app/api/fuel/reports'),headers:new Headers({origin:'https://ziiply.vercel.app'}),text:async()=>JSON.stringify(body)});
 assert.equal(result.status,200);assert.equal(result.body.environment,'production');assert.equal(result.body.duplicate,true);
 const [counts]=await sql`SELECT count(*)::int AS reports FROM ziiply_user_fuel_reports`;assert.equal(counts.reports,1);
 const summary={ok:true,stationTotal:response.body.total,nearest:response.body.stations[0].name,distanceM:Math.round(response.body.stations[0].distanceKm*1000),reportPrices:r.prices,reportCount:counts.reports,duplicatePrevented:result.body.duplicate};
 console.log(JSON.stringify(summary,null,2));return summary;
}
module.exports={verify};
if(require.main===module){const [file,branch]=process.argv.slice(2);verify(JSON.parse(fs.readFileSync(file)),branch).catch(e=>{console.error(e.name,e.code||'',e.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]'));process.exitCode=1});}

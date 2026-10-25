const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function compile(source,require){const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,Date,JSON,console});return exports;}
const photo=compile(fs.readFileSync('src/lib/fuelPhoto.ts','utf8'),()=>{});
const gps={lat:61.43472222222222,lon:26.596527777777776,accuracy:0};
const evidence={photoGps:gps,deviceGps:null,photoTime:null,captureTime:null};
const near={latitude:61.43491,longitude:26.59569},far={latitude:61.44149,longitude:26.68029};
assert.equal(photo.validateFuelStationLocation('offline',evidence,near).ok,true);
assert.equal(photo.validateFuelStationLocation('offline',evidence,far).ok,false);
assert.equal(photo.validateFuelStationLocation('offline',{...evidence,photoGps:null},near).ok,false);
assert.equal(photo.validateFuelStationLocation('offline',{...evidence,photoGps:{...gps,accuracy:2000}},near).ok,false);
assert.equal(photo.validateFuelStationLocation('online',{...evidence,deviceGps:{lat:far.latitude,lon:far.longitude,accuracy:10}},near).ok,false);
assert.equal(photo.validateFuelStationLocation('manual',{...evidence,photoGps:null},far).ok,true);
(async()=>{
 for(const path of ['src/app/api/fuel/reports/route.ts'])for(const confirmed of [false,true]){
  let writes=0;
  const sql=async(strings,...values)=>{const q=strings.join('?');if(q.includes('current_setting'))return [{id:'test'}];if(q.includes('FROM ziiply_fuel_stations'))return [{...far,source:'neste-official',source_station_id:1}];if(/INSERT|UPDATE/.test(q))writes++;return [];};
  const {POST}=compile(fs.readFileSync(path,'utf8'),n=>n==='next/server'?{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}}:n==='@neondatabase/serverless'?{neon:()=>sql}:n.endsWith('fuelDatabase')?{fuelDatabaseConfig:()=>({connection:'test',expectedBranch:'test'})}:n.endsWith('fuelPhotoLearning')?{recordFuelPhotoCorrection:async()=>{}}:photo);
  const body={confirmed:true,id:'00000000-0000-4000-8000-000000000001',stationId:1,prices:{diesel:2.499},observedAt:new Date(Date.now()-60000).toISOString(),photo:'data:image/jpeg;base64,AA==',mode:'offline',timeSource:'photo_exif',locationSource:'photo_exif',gps,evidence,conflictConfirmed:confirmed};
  const r=await POST({headers:{get:k=>k==='origin'?'https://ziiply.vercel.app':null},nextUrl:{origin:'https://ziiply.vercel.app'},text:async()=>JSON.stringify(body)});
  assert.equal(r.status,409,path+' must reject a station 4.5 km away even with confirmation');assert.equal(writes,0,'rejection must happen before report, observation or learning writes');
 }
 console.log('PASS: hard 250m station limit, 49m allowed, 4.5km rejected, missing/inaccurate GPS rejected, confirmation cannot bypass either API');
})().catch(e=>{console.error(e);process.exitCode=1});

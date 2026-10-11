const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const root=require('node:path').resolve(__dirname,'..');
function moduleFrom(path,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/'+path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>imports[name],process,Date,JSON});return exports;}
const helpers=moduleFrom('src/lib/fuelPhoto.ts');
test('OCR prices keep fuel association and never infer unlabeled prices',()=>{
  const p=helpers.parseFuelPhotoText('Diesel 1.798\n95 E10 2,099\n98 E5\n2.350');
  assert.equal(p.diesel,'1,798');assert.equal(p.price95,'2,099');assert.equal(p.price98,'2,350');
  assert.equal(helpers.parseFuelPhotoText('95 E10\nDiesel 1.798').price95,'');
  assert.equal(helpers.parseFuelPhotoText('1.798\n2.099').diesel,'');
});
test('invalid and absent prices cannot be submitted',()=>{
  for(const p of [{},{diesel:0},{diesel:-1},{diesel:'NaN'},{diesel:{}},{diesel:999}])assert.equal(helpers.validateFuelPrices(p),null);
  assert.equal(helpers.validateFuelPrices({diesel:'1,798'}).diesel,1.798);
});
test('report route isolates preview and rejects offline capture-session metadata',async()=>{
  let calls=0;const sql=async(strings)=>{calls++;const query=strings.join('?');return query.includes('neon.branch_id')?[{id:'br-weathered-meadow-b1bwpzst'}]:query.includes('SELECT source_station_id')?[{source_station_id:822}]:[{id:'saved'}];};
  const route=moduleFrom('src/app/api/fuel/reports/route.ts',{'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},'@neondatabase/serverless':{neon:()=>sql},'../../../../lib/fuelPhoto':helpers});
  const previous={env:process.env.VERCEL_ENV,url:process.env.TANKKAUS_TEST_DATABASE_URL};
  const body={id:'9c4a40bc-858b-47ab-8980-452084bce218',stationId:'822',prices:{diesel:'1,798'},photo:'data:image/jpeg;base64,/9j/AA==',observedAt:'2026-10-11T05:10:00Z',gps:{lat:60.63,lon:24.86,accuracy:0},confirmed:true,mode:'offline',timeSource:'photo_exif',locationSource:'photo_exif'};
  const request=(data,origin='https://preview.example')=>({nextUrl:{origin:'https://preview.example'},headers:new Map([['origin',origin]]),text:async()=>JSON.stringify(data)});
  try{
    process.env.VERCEL_ENV='production';process.env.TANKKAUS_TEST_DATABASE_URL='test-placeholder';
    assert.equal((await route.POST(request(body))).status,503);assert.equal(calls,0);
    process.env.VERCEL_ENV='preview';assert.equal((await route.POST(request(body,'https://other.example'))).status,403);
    assert.equal((await route.POST(request({...body,locationSource:'capture_session'}))).status,400);assert.equal(calls,0);
    const conflictBody={...body,mode:'online',evidence:{photoGps:{lat:60.63,lon:24.86,accuracy:0},deviceGps:{lat:61.5,lon:25,accuracy:30},photoTime:body.observedAt,captureTime:'2026-10-11T06:10:00Z'}};
    assert.equal((await route.POST(request(conflictBody))).status,400);assert.equal(calls,0);
    assert.equal((await route.POST(request({...conflictBody,conflictConfirmed:true}))).status,200);assert.equal(calls,3);
    assert.equal((await route.POST(request(body))).status,200);assert.equal(calls,6);
    assert.equal((await route.POST(request({...body,gps:null,locationSource:'manual'}))).status,200);
  }finally{previous.env===undefined?delete process.env.VERCEL_ENV:process.env.VERCEL_ENV=previous.env;previous.url===undefined?delete process.env.TANKKAUS_TEST_DATABASE_URL:process.env.TANKKAUS_TEST_DATABASE_URL=previous.url;}
});

test('photo/device comparison accounts for uncertainty and ignores current GPS for offline photos',()=>{
  const base={photoGps:{lat:60.63,lon:24.86,accuracy:0},deviceGps:{lat:60.6301,lon:24.8601,accuracy:30},photoTime:'2026-10-11T05:10:00Z',captureTime:'2026-10-11T05:11:00Z'};
  assert.equal(helpers.comparePhotoEvidence('online',base).reasons.length,0);
  const moved={...base,deviceGps:{lat:61.5,lon:25,accuracy:30},captureTime:'2026-10-11T06:10:00Z'};
  assert.equal(helpers.comparePhotoEvidence('online',moved).reasons.join(','),'location,time');
  assert.equal(helpers.comparePhotoEvidence('offline',moved).reasons.length,0);
  assert.equal(helpers.comparePhotoEvidence('online',{...base,photoGps:null,photoTime:null}).reasons.length,0);
  assert.equal(helpers.comparePhotoEvidence('online',{...base,deviceGps:{lat:60.634,lon:24.86,accuracy:1000}}).reasons.length,0);
});

test('station recognition requires unambiguous nearby GPS and supports OCR brand',()=>{
 const gps={lat:60.63,lon:24.86,accuracy:30};
 const stations=[{id:'1',name:'ABC Test',chain:'ABC',latitude:60.63,longitude:24.86},{id:'2',name:'Neste Test',chain:'Neste',latitude:60.6301,longitude:24.86}];
 assert.equal(helpers.identifyFuelPhotoStation(stations,gps,'ABC Diesel 1.798',false),'1');
 assert.equal(helpers.identifyFuelPhotoStation(stations,gps,'Diesel 1.798',false),'');
 assert.equal(helpers.identifyFuelPhotoStation(stations,gps,'ABC',true),'');
 assert.equal(helpers.identifyFuelPhotoStation(stations,null,'ABC',false),'');
 assert.equal(helpers.identifyFuelPhotoStation(stations,{...gps,lat:61},'ABC',false),'');
 assert.equal(helpers.identifyFuelPhotoStation(stations,{...gps,accuracy:1000},'ABC',false),'');
 assert.equal(helpers.fuelPhotoBrand('ABC Neste'),null);
});

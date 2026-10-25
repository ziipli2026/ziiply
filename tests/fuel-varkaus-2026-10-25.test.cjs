const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');

// Real ABC Prisma Varkaus report, 2026-10-25 07:28 UTC, from Neon.
// No photo bytes are stored in this fixture: test GPS identification and OCR fallback only.
const gps={lat:62.31573508597763,lon:27.85795752378769,accuracy:4.748651530191762};
const stations=[
 {id:'263103947907754',name:'ABC Prisma Varkaus',chain:'ABC',latitude:62.315726,longitude:27.858118},
 {id:'48110669191229',name:'Neste Express Varkaus Käsityökatu',chain:'Neste',latitude:62.316,longitude:27.8598},
];
const lib=fs.readFileSync('src/lib/fuelPhoto.ts','utf8');
const js=ts.transpileModule(lib,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exports={};vm.runInNewContext(js,{exports,require});
test('25 Oct Varkaus GPS alone selects ABC Prisma Varkaus',()=>{
 assert.equal(exports.identifyFuelPhotoStation(stations,gps,'',false),stations[0].id);
});
test('25 Oct Varkaus: OCR without brand cannot erase GPS selection',()=>{
 const gpsId=exports.identifyFuelPhotoStation(stations,gps,'',false);
 const ocrId=exports.identifyFuelPhotoStation(stations,gps,'Neste',false);
 assert.equal(ocrId,'');
 const component=fs.readFileSync('src/app/components/ziiply/desktop/DesktopFuelPhotoReport.tsx','utf8');
 assert.match(component,/const finalIdentified=identified\|\|gpsIdentified/);
 assert.match(component,/setStationId\(previous=>finalIdentified\|\|previous\)/);
 assert.equal(ocrId||gpsId,gpsId);
});
test('25 Oct Varkaus evidence has no GPS conflict',()=>{
 const comparison=exports.comparePhotoEvidence('online',{photoGps:null,deviceGps:gps,photoTime:null,captureTime:'2026-10-25T07:27:00.000Z'});
 assert.equal(comparison.reasons.length,0);
});

const assert=require('node:assert/strict');const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const tank=read('src/app/tankkaus/page.tsx');
const report=read('src/app/components/ziiply/desktop/DesktopFuelPhotoReport.tsx');
const lib=read('src/lib/fuelPhoto.ts');
const api=read('src/app/api/fuel/reports/route.ts');
const checks=[
 ['Tankkaus embeds the shared photo reporter',tank.includes('DesktopFuelPhotoReport')],
 ['Reporter imports GPS station recognition',report.includes('identifyFuelPhotoStation')],
 ['Photo OCR falls back to GPS-only station recognition',/const gpsIdentified=identifyFuelPhotoStation\(candidates\|\|\[\],location,"",/.test(report)&&report.includes('identified||(fuelPhotoBrand(result.text)?"":gpsIdentified)')],
 ['Conflicting OCR brand cannot be overridden by GPS-only fallback',report.includes('fuelPhotoBrand(result.text)?"":gpsIdentified')],
 ['Manual selection prevents station overwrite',report.includes('stationChoiceEdited.current')&&report.includes('onChange={e=>{stationChoiceEdited.current=true')],
 ['Reporter submits fuel report through API',report.includes('fetch("/api/fuel/reports"')],
 ['Submission preserves manual station selection flag',report.includes('stationSelectedManually:stationChoiceEdited.current')],
 ['Station validation runs before submission',report.includes('validateFuelStationLocation(mode,evidence,selectedStation,stationChoiceEdited.current)')],
 ['Server checks station location',api.includes('validateFuelStationLocation')],
 ['Automatic GPS radius is 30m',lib.includes('const radiusM=30')],
 ['Server report validation remains separate',lib.includes('fuelPhotoStationDistanceLimit')],
];
for(const [name,ok] of checks){assert.ok(ok,name);console.log('PASS',name)}
console.log(checks.length+'/'+checks.length+' integration wiring checks PASS');

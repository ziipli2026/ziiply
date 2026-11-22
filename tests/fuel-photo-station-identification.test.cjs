const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsPhoto={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/fuelPhoto.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsPhoto});
const {identifyFuelPhotoStation:identify,fuelPhotoBrand:brand}=exportsPhoto;
const photoGps={lat:61.43472222222222,lon:26.596527777777776,accuracy:5};
const st1={id:'st1',name:'St1 Mäntyharju Karankamäki',chain:'St1',latitude:61.43491,longitude:26.59569};
const neste={id:'neste',name:'Neste Mäntyharju Vihantasalmi',chain:'Neste',latitude:61.44149,longitude:26.68029};
const gps={lat:st1.latitude,lon:st1.longitude,accuracy:5};
const near={...gps,lat:gps.lat+0.00025}; // About 28 m from the station.
const outside={...gps,lat:gps.lat+0.00029}; // About 32 m from the station.
assert.equal(identify([st1,neste],near,'',false),'st1','a unique station inside 30 m is identified');
assert.equal(identify([st1,neste],outside,'St1',false),'','a brand match outside 30 m is rejected');
assert.equal(identify([st1,neste],photoGps,'St1',false),'','the original 49 m photo requires manual selection');
assert.equal(identify([st1,neste],{...gps,accuracy:0},'St1',false),'','zero accuracy is unknown');
assert.equal(identify([st1,neste],null,'St1',false),'','a logo alone cannot locate a branch');
assert.equal(identify([st1,neste],gps,'Neste',false),'','a distant chain must not replace the photographed station');
assert.equal(identify([st1,neste],gps,'St1',true),'','conflicting location evidence requires confirmation');
const neighbour={...st1,id:'other',name:'Neste neighbouring station',chain:'Neste',latitude:st1.latitude+0.00030};
assert.equal(identify([st1,neighbour],gps,'St1',false),'','a second station within GPS uncertainty requires manual selection');
assert.equal(identify([st1,{...st1,id:'second'}],gps,'St1',false),'','two same-chain candidates remain ambiguous');
assert.equal(brand('St1 Shell'),'St1');assert.equal(brand('ST 1'),'St1');
assert.equal(brand('St1 ABC'),null);
console.log('PASS: 30m radius, manual selection at 49m, GPS accuracy, brand and ambiguity');

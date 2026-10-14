const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('src/app/components/ziiply/desktop/DesktopFuelPhotoReport.tsx','utf8');
const start=source.indexOf('  function requestCaptureLocation()');
const end=source.indexOf('  async function capturePhoto()',start);
const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
function request(navigator){return vm.runInNewContext(code+'requestCaptureLocation()', {navigator,Date,Promise});}
test('capture requests fresh accurate GPS and accepts a current fix',async()=>{
  const result=await request({geolocation:{getCurrentPosition(success,error,options){
    assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);
    success({timestamp:Date.now(),coords:{latitude:60.63,longitude:24.86,accuracy:10}});
  }}});
  assert.equal(result.lat,60.63);assert.equal(result.accuracy,10);
});
test('capture rejects a stale browser fix',async()=>{
  assert.equal(await request({geolocation:{getCurrentPosition(success){success({timestamp:Date.now()-60000,coords:{latitude:60,longitude:24,accuracy:10}});}}}),null);
});
test('denied or unavailable GPS allows manual station choice',async()=>{
  assert.equal(await request({}),null);
  assert.equal(await request({geolocation:{getCurrentPosition(success,error){error({code:1});}}}),null);
});

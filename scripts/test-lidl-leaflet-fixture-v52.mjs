import{readFileSync,mkdtempSync,writeFileSync,rmSync}from"node:fs";
import{tmpdir}from"node:os";
import{join}from"node:path";
import{spawnSync}from"node:child_process";
import{fileURLToPath}from"node:url";
const fixture=fileURLToPath(new URL("../data/lidl/hyvinkaa-paper-leaflet-w40-2026.fixture.json",import.meta.url));
const checker=fileURLToPath(new URL("./check-lidl-leaflet-fixture-v51.mjs",import.meta.url));
const base=JSON.parse(readFileSync(fixture,"utf8"));
const dir=mkdtempSync(join(tmpdir(),"lidl-leaflet-test-"));
let failures=0;
function test(label,change,expected,reason=""){
 const input=structuredClone(base);if(change)change(input);
 const file=join(dir,label+".json");writeFileSync(file,JSON.stringify(input));
 const p=spawnSync(process.execPath,[checker,file],{encoding:"utf8"});
 let output;try{output=JSON.parse(p.stdout)}catch{output=null}
 const ok=p.error===undefined&&p.signal===null&&p.stderr.trim()===""&&p.status===(expected?0:1)&&output?.passed===expected&&Array.isArray(output.errors)&&(expected?output.errors.length===0:output.errors.some(e=>e.includes(reason)));
 console.log(JSON.stringify({label,ok,errors:output?.errors??null}));
 if(!ok)failures++;
}
try{
 test("baseline",null,true);
 test("null-record",d=>{d.records[0]=null},false,"expected offer object");
 test("array-record",d=>{d.records[0]=[]},false,"expected offer object");
 test("missing-records",d=>{delete d.records},false,"No leaflet records");
 test("bad-month",d=>{d.records[0].validFrom="2026-13-01"},false,"invalid validity dates");
 test("bad-day",d=>{d.records[0].validThrough="2026-02-30"},false,"invalid validity dates");
 test("missing-end-note",d=>{d.records[0].validThrough=null},false,"unknown-end provenance");
 test("bundle-quantity",d=>{d.records.find(r=>r.priceBasis==="bundle").requiredQuantity=1},false,"requires at least 2");
 test("fabricated-ean",d=>{d.records[0].ean="6410405082657"},false,"must not assert EAN");
 test("fabricated-regular-price",d=>{d.records[0].regularPriceEur=0.79},false,"must not assert EAN");
}finally{rmSync(dir,{recursive:true,force:true})}
if(failures)process.exitCode=1;

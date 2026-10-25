const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const led={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/fuelPhotoLed.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:led});
const w=480,h=360;
function frame(colour,missing=false){
 const p=new Uint8ClampedArray(w*h*4);for(let i=3;i<p.length;i+=4)p[i]=255;
 const rect=(x,y,a,b)=>{for(let yy=y;yy<y+b;yy++)for(let xx=x;xx<x+a;xx++){const i=(yy*w+xx)*4;p[i]=255;p[i+1]=colour==='white'?255:30;p[i+2]=colour==='white'?255:30;}};
 const patterns={2:'1101101',4:'0110011',9:'1111011'};
 if(!missing){for(const [i,d] of [...'2499'].entries()){
  const x=200+i*52,y=150,segments=[[5,0,25,6],[29,6,6,23],[29,33,6,23],[5,56,25,6],[0,33,6,23],[0,6,6,23],[5,28,25,6]];
  [...patterns[d]].forEach((on,j)=>{if(on==='1'){const [dx,dy,a,b]=segments[j];rect(x+dx,y+dy,a,b);}});
 }rect(242,202,5,5);}
 return p;
}
for(const colour of ['red','white']){
 const p=frame(colour),rows=led.findFuelLedRows(p,w,h);
 assert(rows.some(r=>r.top<160&&r.bottom>200),colour+' LED row must be located');
 const full=rows.find(r=>r.top<160&&r.bottom>200);
 assert.equal(led.fuelLedSegments(p,w,h,full),'2,499',colour+' digits must decode');
 const bands=led.selectFuelBurstRows([frame(colour,true),p],w,h);
 assert(bands.some(b=>b.top<160&&b.bottom>200&&b.frame===1),'burst must recover the complete '+colour+' row');
}
for(const text of ['D','DI','SMART DIESEL'])assert.equal(led.fuelRowLabel(text),'diesel');
for(const text of ['MPÖ PLUS','NERO DIESEL','MY DIESEL','E85','AdBlue'])assert.equal(led.fuelRowLabel(text),null);
console.log('PASS: red/white LED masks and digits, multi-frame recovery, ordinary diesel and excluded grades');

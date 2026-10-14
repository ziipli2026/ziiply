const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsLed={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/fuelPhotoLed.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsLed});
const shapes=['1111110','0110000','1101101','1111001','0110011','1011011','1011111','1110000','1111111','1111011'];
function display(value,{dot=true,brightness=240}={}){
 const width=230,height=110,pixels=new Uint8ClampedArray(width*height*4);
 const rect=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*width+xx)*4;pixels[i]=brightness;pixels[i+1]=110;pixels[i+2]=130;pixels[i+3]=255;}};
 const segments=[[4,0,30,7],[31,7,7,32],[31,43,7,37],[4,73,30,7],[0,43,7,37],[0,7,7,32],[4,36,30,7]];
 [...value].forEach((n,j)=>{const x=10+j*52+(j?10:0);shapes[+n].split('').forEach((on,k)=>{if(on==='1'){const [a,b,w,h]=segments[k];rect(x+a,15+b,w,h);}})});
 if(dot)rect(54,86,6,6);
 return {pixels,width,height,row:{left:0,right:width,top:0,bottom:height}};
}
function read(value,options){const d=display(value,options);return exportsLed.fuelLedSegments(d.pixels,d.width,d.height,d.row);}
for(const value of ['2178','2275','2421','2103','2469','2056','2880'])assert.equal(read(value),value[0]+','+value.slice(1),value);
assert.equal(read('2178',{dot:false}),'','No guessed decimal point');
assert.equal(read('2178',{brightness:155}),'','A single mask cannot confirm a price');
console.log('LED shape regression checks passed');

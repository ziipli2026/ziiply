const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const source=fs.readFileSync('src/lib/fuelPhoto.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports={};vm.runInNewContext(js,{exports:moduleExports,require,console});
const {identifyFuelPhotoStation:identify}=moduleExports;
const seo={id:'seo',name:'SEO Monninkylä',chain:'SEO',latitude:60.49568,longitude:25.55317};
const neste={id:'neste',name:'Neste Truck Askola',chain:'Neste',latitude:60.4948,longitude:25.55346};
const location={lat:60.495829316356925,lon:25.55292381728906,accuracy:4.748651530191761};
const cases=[
 ['SEO GPS without OCR', [seo,neste],location,'',false,'seo'],
 ['SEO GPS numbers only', [seo,neste],location,'2.199 2.278 2.585',false,'seo'],
 ['SEO OCR confirms', [seo,neste],location,'SEO 2.199',false,'seo'],
 ['conflicting Neste OCR', [seo,neste],location,'Neste 2.199',false,''],
 ['conflicting photo GPS', [seo,neste],location,'',true,''],
 ['poor accuracy', [seo,neste],{...location,accuracy:80},'',false,''],
 ['nearby second station', [seo,{...seo,id:'adjacent',name:'Other',chain:'Other',longitude:25.55318}],location,'',false,''],
 ['outside 30 m', [seo,neste],{lat:60.4965,lon:25.5529,accuracy:5},'',false,''],
 ['no location', [seo,neste],null,'',false,''],
];
for(const [name,stations,gps,ocr,conflicted,expected] of cases){const actual=identify(stations,gps,ocr,conflicted);assert.equal(actual,expected,name);console.log('PASS',name,actual||'(manual confirmation)');}
console.log('9/9 PASS');

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

const near=(id,lat,lon,chain='SEO')=>({id,name:chain+' station',chain,latitude:lat,longitude:lon});
const centered={lat:60.5,lon:25.5,accuracy:3};
const offsetLat=meters=>meters/111195;
const checks=[
 ['single station at 0m', [near('a',60.5,25.5)],centered,'',false,'a'],
 ['single station at 29m', [near('a',60.5+offsetLat(29),25.5)],centered,'',false,'a'],
 ['single station at 31m', [near('a',60.5+offsetLat(31),25.5)],centered,'',false,''],
 ['two stations both within 30m', [near('a',60.5+offsetLat(10),25.5),near('b',60.5+offsetLat(20),25.5,'Neste')],centered,'',false,''],
 ['OCR disambiguates two within 30m', [near('a',60.5+offsetLat(10),25.5),near('b',60.5+offsetLat(20),25.5,'Neste')],centered,'SEO',false,''],
 ['GPS accuracy 30m at same point', [near('a',60.5,25.5)],{...centered,accuracy:30},'',false,'a'],
 ['GPS accuracy 31m rejected', [near('a',60.5,25.5)],{...centered,accuracy:31},'',false,''],
 ['missing accuracy rejected', [near('a',60.5,25.5)],{...centered,accuracy:null},'',false,''],
 ['zero accuracy rejected', [near('a',60.5,25.5)],{...centered,accuracy:0},'',false,''],
 ['OCR mismatch rejects location', [near('a',60.5,25.5)],centered,'Neste',false,''],
 ['conflict blocks regardless of OCR', [near('a',60.5,25.5)],centered,'SEO',true,''],
 ['station near GPS uncertainty boundary', [near('a',60.5+offsetLat(28),25.5),near('b',60.5+offsetLat(32),25.5,'Neste')],centered,'',false,''],
 ['clear distant competitor', [near('a',60.5+offsetLat(10),25.5),near('b',60.5+offsetLat(90),25.5,'Neste')],centered,'',false,'a'],
 ['station list empty', [],centered,'',false,''],
];
for(const [name,stations,gps,ocr,conflicted,expected] of checks){const actual=identify(stations,gps,ocr,conflicted);assert.equal(actual,expected,name);console.log('PASS',name,actual||'(manual confirmation)');}
console.log('23/23 PASS');

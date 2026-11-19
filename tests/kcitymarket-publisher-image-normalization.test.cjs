const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/app/components/ziiply/offerSearch/providers/kCitymarketPublisherImages.ts';
const sha = 'a'.repeat(64);
const url = 'https://example.invalid/47LV.pdf';
const image = '/citymarket-leaflets/' + sha + '/images.svg#image1';
const manifest = {publications:{[url]:{pdfSha256:sha,pageCount:1,offerCount:2,images:{
  'kcm:spatial:1:juusto-nack:1.99':image,
  'kcm:spatial:2:another product:2.99':'/citymarket-leaflets/'+sha+'/images.svg#image2'
}}}};
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',compiled)(name=>{
  if(name==='./data/kCitymarketLeafletImages.json') return manifest;
  throw Error('Unexpected import '+name);
},mod,mod.exports);
const {getKCitymarketPublisherImage:lookup,auditKCitymarketPublisherImages:audit}=mod.exports;
test('exact verified image identity remains valid',()=>assert.equal(lookup(url,'kcm:spatial:1:juusto-nack:1.99'),image));
test('PDF line-wrap hyphen resolves only within the same leaflet',()=>assert.equal(lookup(url,'kcm:spatial:9:juustonack:1.99'),image));
test('whitespace differences resolve to the same verified product',()=>assert.equal(lookup(url,'kcm:spatial:9:another   product:2.99'),'/citymarket-leaflets/'+sha+'/images.svg#image2'));
test('unknown leaflet cannot reuse images',()=>assert.equal(lookup('https://example.invalid/other.pdf','kcm:spatial:9:juustonack:1.99'),null));
test('different product never receives guessed image',()=>assert.equal(lookup(url,'kcm:spatial:9:juustokakku:1.99'),null));
test('audit reports missing identities independently',()=>{
  const result=audit(url,['kcm:spatial:9:juustonack:1.99','kcm:spatial:9:unknown:1.99']);
  assert.equal(result.matched,1);assert.equal(result.missing.length,1);
});

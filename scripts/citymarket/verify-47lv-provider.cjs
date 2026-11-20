const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');

async function main(){
 const folder=process.argv[2]||'47lv-fresh';
 const parsed=JSON.parse(fs.readFileSync(path.join(folder,'parser-evidence.json'),'utf8'));
 const base=path.resolve('src/app/components/ziiply/offerSearch/providers');
 const blocked=()=>{throw Error('Publication audit must not access a database');};
 const dependencies={
  './kCitymarketSpatialParser.js':{parseKCitymarketSpatialLeaflet:async()=>parsed},
  'next/cache':{unstable_cache:fn=>fn},
  '@neondatabase/serverless':{neon:blocked},
  '../publicationStore':{readActivePublicationOffers:blocked,storeParsedPublication:blocked},
  './kCitymarketPublisherImages':{},
 };
 const filename=path.join(base,'kCitymarketProvider.ts');
 const source=fs.readFileSync(filename,'utf8')
  .replace('async function fetchKCitymarketOffersFresh(','export async function fetchKCitymarketOffersFresh(');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const modules=require('node:module').createRequire(filename);
 const mod={exports:{}};
 new Function('require','module','exports',code)(name=>dependencies[name]??modules(name),mod,mod.exports);
 const offers=await mod.exports.fetchKCitymarketOffersFresh(parsed.leaflet);
 const {partitionDailyGroceryOffers}=modules('./kCitymarketDailyGroceryGate.js');
 const result=partitionDailyGroceryOffers(offers);
 fs.writeFileSync(path.join(folder,'provider-offers.json'),JSON.stringify(result,null,2));
 const reconciled=JSON.parse(fs.readFileSync(path.join(folder,'reconciled-offers.json'),'utf8'));
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/citymarket/47lv-neon-candidate.json','utf8'));
 const aliases=[
  [/^Smuuti Skin/i,/^SMUUTI SKIN/i],
  [/^TORTILLA ORIGINAL MEDIUM/,/^TORTILLA ORIGINAL MEDIUM 320 g/],
  [/^GLÖGI 8 %/,/^GLÖGI 8 % 0,75 l\/pl$/],
  [/^Colgate HAMMASTAHNARASIAT/,/^Colgate HAMMASTAHNARASIAT/],
  [/^L’Oréal Paris Triple Active/,/^Triple Active Hyaluron/],
 ];
 const seen=new Set();
 assert.equal(result.quarantined.length,0,JSON.stringify(result.quarantined));
 for(const expected of fixture){
  const source=reconciled.find(row=>row.referenceTitle===expected.title);
  assert.ok(source,expected.title);
  const alias=aliases.find(([pattern])=>pattern.test(expected.title));
  const rows=result.accepted.filter(row=>alias?alias[1].test(row.title):row.title===expected.title);
  assert.equal(rows.length,1,expected.title);
  const [actual]=rows;
  assert.ok(!seen.has(actual),actual.title);
  seen.add(actual);
  assert.equal(actual.price,source.price,actual.title);
  assert.equal(actual.offerQuantity??1,source.quantity??1,actual.title);
  assert.equal(actual.offerUnit??null,source.unit,actual.title);
  assert.equal(actual.discountPercent??null,source.discountPercent,actual.title);
  assert.equal(actual.validFrom,expected.validFrom,actual.title);
  assert.equal(actual.validTo,expected.validTo,actual.title);
  if(actual.offerQuantity>1&&/^owned-printed/.test(actual.resolutionSource)){
   assert.equal(actual.priceBasis,'set-total',actual.title);
   assert.ok(actual.priceText?.includes(' / '+actual.offerQuantity),actual.title);
  }
 }
 assert.equal(seen.size,result.accepted.length,'Every accepted offer must be verified');
 for(const [title,amount] of [[/^Coca-Cola/,1.8],[/^Kåska/,0.30],[/^Crisp RADLER/,0.30]]){
  const offer=result.accepted.find(row=>title.test(row.title));
  assert.equal(offer?.depositTotal,amount,String(title));
  assert.equal(offer?.depositIncluded,true,String(title));
 }
 console.log('47LV provider rows',offers.length,'accepted',result.accepted.length,'quarantined',result.quarantined.length);
}
main().catch(error=>{console.error(error);process.exitCode=1;});

// Generate the real provider's 47LV offer rows; never write to a database.
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
(async()=>{
 const base=path.resolve('src/app/components/ziiply/offerSearch/providers');
 const load=async(name)=>import(path.join(base,name));
 const modules={
  './kCitymarketOCRRepair.js':await load('kCitymarketOCRRepair.js'),
  './kCitymarket45LVPriceGuard.js':await load('kCitymarket45LVPriceGuard.js'),
  './kCitymarket45AVCorrections.js':await load('kCitymarket45AVCorrections.js'),
  './kCitymarketProductRows.js':await load('kCitymarketProductRows.js'),
  './kCitymarket42AVTitleCleanup.js':await load('kCitymarket42AVTitleCleanup.js'),
  './kCitymarketSpatialParser.js':await load('kCitymarketSpatialParser.js'),
  './kCitymarket47LVStagingGuard.js':await load('kCitymarket47LVStagingGuard.js'),
  './kCitymarketPublisherImages':{getKCitymarketPublisherImage:()=>null,auditKCitymarketPublisherImages:()=>({})},
  './data/kCitymarketLeafletImages.json':require(path.join(base,'data/kCitymarketLeafletImages.json')),
  'next/cache':{unstable_cache:fn=>fn},
  '@neondatabase/serverless':{neon:()=>{throw Error('Database writes forbidden in candidate generator')}},
  '../publicationStore':{readActivePublicationOffers:async()=>[],storeParsedPublication:async()=>{throw Error('Database writes forbidden')}}
 };
 const src=fs.readFileSync(path.join(base,'kCitymarketProvider.ts'),'utf8')
  .replace('async function fetchKCitymarketOffersFresh(', 'export async function fetchKCitymarketOffersFresh(');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',js)(name=>{
   if(!Object.prototype.hasOwnProperty.call(modules,name))throw Error('Unexpected import '+name);
   return modules[name];
 },mod,mod.exports);
 const url='https://kcm-tarjouslehdet.k-ruoka.fi/94s5ius_tarjouslehti_47LV_KCM/index.html';
 const offers=await mod.exports.fetchKCitymarketOffersFresh(url);
 const result=modules['./kCitymarket47LVStagingGuard.js'].validate47LVPublication(offers,'2026-11-19-W47-LV');
 const report={edition:'2026-11-19-W47-LV',sourceUrl:url,offerCount:offers.length,ok:result.ok,issues:result.issues,
   missingImages:offers.filter(x=>!x.imageUrl).length};
 fs.mkdirSync('/tmp/kcm-47lv-candidate',{recursive:true});
 fs.writeFileSync('/tmp/kcm-47lv-candidate/report.json',JSON.stringify(report,null,2));
 fs.writeFileSync('/tmp/kcm-47lv-candidate/offers.json',JSON.stringify(offers,null,2));
 console.log('KCM_47LV_REAL_PROVIDER_CANDIDATE',JSON.stringify(report));
 if(!result.ok)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

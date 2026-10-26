require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict'),Module=require('node:module'),fs=require('node:fs'),ts=require('typescript');
const {recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const fixture=require('./fixtures/recipe-carrot-category-products.json');
const load=Module._load,fetchOriginal=global.fetch;
Module._load=function(id,...args){
 if(id==='next/server')return {after:()=>{},NextResponse:{json:(body)=>body}};
 if(id==='@/lib/eanBank')return {observeEanProductsBestEffort:()=>{}};
 if(id==='@/lib/normalSearchFallback')return {getZeroResultFallbackQuery:()=>null};
 if(id==='@/lib/ruoanhintaPagination')return {appendRuoanhintaPages:async rows=>rows};
 return load.call(this,id,...args);
};
const routePath=require('path').join(__dirname,'../src/app/api/k-products/route.ts');
const m=new Module(routePath,module);m.filename=routePath;
m._compile(ts.transpileModule(fs.readFileSync(routePath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,routePath);
Module._load=load;
global.fetch=async()=>({ok:true,status:200,json:async()=>({items:fixture.items})});
(async()=>{
 try{
  const body=await m.exports.GET(new Request('https://example.test/api/k-products?store=3221&search=porkkana'));
  assert.equal(body.status,200);assert.equal(body.items.length,fixture.items.length);
  for(const p of body.items)assert.equal(p.category,fixture.items.find(x=>String(x.id)===p.id).category,p.name+' category dropped by API');
  const good=body.items.filter(p=>recipeProductCompatible('porkkanaa',p));
  assert.ok(good.some(p=>/^Porkkana pesty Suomi/i.test(p.name)),'fresh carrot disappeared');
  for(const p of body.items.filter(p=>/lasten|lapset|lemmik|koira|leivat|sekoitu/i.test(p.category||'')))assert.equal(recipeProductCompatible('porkkanaa',p),false,p.name+' leaked into raw carrot results');
  assert.ok(good.length<body.items.length);
  console.log(`PASS: actual K route retains categories for ${body.items.length} live rows; ${good.length} compatible carrot products; baby food, bread and pet food rejected`);
 }finally{global.fetch=fetchOriginal;}
})().catch(e=>{console.error(e);process.exitCode=1});

for(const [name,category]of [
 ['Valio Onni peruna-porkkanavelli 210g','lapset/lastenruoat'],
 ['Piltti Peruna-lihavuoka lastenateria','lapset/lastenruoat'],
 ['Apetit Kotimainen Peruna & uunijuurekset pakaste','pakasteet/vihannes--ja-juurespakasteet/kasvis--ja-vihannessekoitukset'],
 ['Kokkikartano kirjolohifilepala ja paahdetut perunat','valmisruoka/ateriat']
])assert.equal(recipeProductCompatible('perunoita',{name,category}),false,name);
for(const name of ['Peruna kiinteä Suomi','Pirkka suomalainen pesty Siikli ruokaperuna 1kg'])assert.ok(recipeProductCompatible('perunoita',{name,category:'hedelmat-ja-vihannekset/juurekset/perunat'}),name);
console.log('PASS: potato fallback uses shared category gates while retaining raw-potato matches');

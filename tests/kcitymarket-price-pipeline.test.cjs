const test=require('node:test');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>{
 let source=fs.readFileSync(f,'utf8');
 if(f.endsWith('/ZiiplyMobileOfferSearchCard.tsx'))source=source.replace(/(\[selectedOfferChainV39, setSelectedOfferChainV39\] = React.useState<[^>]+>\()null/,'$1"K"');
 let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 // SSR has no click events: initialize only the chain picker state to the K
 // selection used by this simulation, without changing the component source.
 if(f.endsWith('/ZiiplyMobileOfferSearchCard.tsx'))code=code.replace(/(\[selectedOfferChainV39, setSelectedOfferChainV39\] = React.useState\()null(\))/,'$1"K"$2');
 m._compile(code,f);
};
const input=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/citymarket/42LV-prepared-price-input.json'),'utf8'));
const {offers,campaigns}=input;
const OriginalDate=Date;
global.Date=class extends OriginalDate { constructor(...args){super(...(args.length?args:['2026-10-16T03:00:00Z']));}static now(){return OriginalDate.parse('2026-10-16T03:00:00Z');}};
const sqlCalls=[];
const sql=async(strings,...params)=>{const query=Array.isArray(strings)?strings.join('?'):String(strings);sqlCalls.push(query);
 if(/SELECT/i.test(query)&&query.includes('ziiply_kcitymarket_tjek_snapshots'))return[{offers:campaigns,publication_ids:['J70zT0hU','0pcd4Gd4','lqU0Qv1a'],updated_at:'2026-10-16'}];
 if(/SELECT/i.test(query)&&query.includes('ziiply_offer_publications'))return[{offers}];
 return[];
};
const original=Module._load;Module._load=function(id,parent,isMain){if(id==='@neondatabase/serverless')return{neon:()=>sql};if(id.startsWith('@/'))id=root+'/src/'+id.slice(2);return original.call(this,id,parent,isMain);};
process.env.DATABASE_URL='postgresql://simulation@localhost/simulation';
const base=root+'/src/app/components/ziiply/offerSearch/';
const route=require(root+'/src/app/api/offers/search/route.ts');
const core=require(base+'ziiplyOfferSearchCore.ts');
const cards=require(root+'/src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx');
let apiCalls=0,apiRows=0,externalCalls=[];
global.fetch=async(url,init)=>{
 if(!String(url).startsWith('/api/offers/search?')){externalCalls.push(String(url));throw Error('External network forbidden during simulation: '+url);}
 apiCalls++;const response=await route.GET(new Request('http://simulation.local'+url,init));apiRows=(await response.clone().json()).results?.length;return response;
};
test('API through final price rendering retains all source offers and hides products while loading',async()=>{
 const context={kStoreName:'K-Citymarket Hyvinkää',kStoreId:'N183'};
 const result=await core.searchZiiplyGostaOffersV146({query:'',context,captureDiagnostics:true});
 const clean=core.cleanZiiplyGostaOfferResultsV146(result.results);
 const mapped=clean.map(core.mapZiiplyGostaOfferToCardOfferV147);
 const rows=mapped.map(row=>({id:row.id,title:row.title,tab:row.campaignType,display:cards.getOfferPrice(row),layout:cards.splitOfferDisplayPrice(cards.getOfferPrice(row)),source:row.__sourceOfferSearchResult}));
 const counts={input:offers.length+campaigns.length,api:apiRows,core:result.results.length,clean:clean.length,cards:rows.length,offers:rows.filter(r=>r.tab!=='campaign').length,campaigns:rows.filter(r=>r.tab==='campaign').length,apiCalls,externalCalls:externalCalls.length};
 assert.equal(apiRows,544);assert.equal(rows.length,544);assert.equal(counts.offers,89);assert.equal(counts.campaigns,455);assert.equal(externalCalls.length,0);
 const prices=rows.filter(r=>r.tab!=='campaign').map(r=>({title:r.title,display:r.display,layout:r.layout}));
 const React=require(root+'/node_modules/react');
 const {renderToStaticMarkup}=require(root+'/node_modules/react-dom/server');
 counts.rendered={};
 for(const tab of ['offer','campaign']){
  const tabItems=mapped.filter(r=>(r.campaignType==='campaign'?'campaign':'offer')===tab);
  const html=renderToStaticMarkup(React.createElement(cards.default,{open:true,offers:tabItems,filter:'kaikki',contentTab:tab==='offer'?'offers':'campaigns',categorySuggestions:[],onAddOffer:()=>{}}));
  const articles=(html.match(/<article\b/g)||[]).length;
  assert.equal(articles,tabItems.length,'Final card rendering lost rows');
  const basisCount=(html.match(/class="block w-full text-center text-\[0\.76rem\]/g)||[]).length;
  const expected=tabItems.filter(r=>cards.splitOfferDisplayPrice(cards.getOfferPrice(r)).basis).length;
  assert.equal(basisCount,expected,'A price basis is missing from the rendered card');
  counts.rendered[tab]={articles,bases:basisCount};
  const loading=renderToStaticMarkup(React.createElement(cards.default,{open:true,offers:tabItems,filter:'kaikki',loading:true,categorySuggestions:[]}));
  assert.equal((loading.match(/<article\b/g)||[]).length,0,'Loading leaked partial products');
 }
 for(const row of rows){
  if(row.display.includes(' / '))assert.ok(row.layout.basis,row.display);
  if(row.layout.basis)assert.equal(row.layout.amount+' '+row.layout.basis,row.display);
 }
 console.log('SIMULATION',JSON.stringify(counts));
 
});

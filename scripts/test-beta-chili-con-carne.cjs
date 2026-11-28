require('./recipe-audit-runtime.cjs');
const core=require('../src/app/components/ziiply/justiina/recipeCore.ts');
const {recipeProductCompatible}=require('../src/app/components/ziiply/justiina/recipeSearch.ts');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ingredients=["300 g naudanpaistia","1 rkl öljyä","1 rkl margariinia","2 dl vettä","1/2 tl suolaa","1/2 tl chilipippuria","3 rkl tomaattisosetta","2 valkosipulinkynttä","2 sipulia","1 paprika","1 tlk tomaattimurskaa","1 tlk (420 g) valkoisia papuja"];
const draft=core.parseRecipeText('CHILI CON CARNE\nAinekset:\n'+ingredients.join('\n'));
assert.equal(draft.ingredients.length,ingredients.length,'All 12 ingredient lines must parse');
const plan=core.prepareRecipeSearch(draft.ingredients,draft.instructions,'CHILI CON CARNE');
assert.equal(plan.items.length,11,'Water must not become a purchased grocery');
assert.ok(plan.items.some(i=>i.name.includes('valkoisia papuja')&&i.amount===420&&i.unit==='g'),'Bean can size must be 420g');
const mode=process.argv[2]||'mobile';
const base=process.env.RECIPE_AUDIT_BASE||'https://beta.ziiply.fi';
const report={mode,base,sourceCommit:'2fe6a1fabc06b5afcd8470eb7f903f9ff15bd1a7',title:draft.title,inputIngredients:ingredients,parsed:draft.ingredients,steps:plan.items.map((x,i)=>({step:i+1,ingredient:x,chainResults:[]})),errors:[],accessBlocked:false};
(async()=>{
 for(const step of report.steps){
   for(const [chain,store] of [['s',292],['k',3221]]){
     const qs=new URLSearchParams({search:step.ingredient.searchTerm,store:String(store),recipeIngredient:step.ingredient.name});
     const url=base+'/api/'+chain+'-products?'+qs;
     try{
       const res=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{Accept:'application/json'}});
       if(res.status===401||res.status===403){report.accessBlocked=true;report.errors.push({chain,ingredient:step.ingredient.name,status:res.status,kind:'beta_access_blocked'});continue;}
       if(!res.ok){report.errors.push({chain,ingredient:step.ingredient.name,status:res.status,kind:'provider_http'});continue;}
       const body=await res.json();
       const products=Array.isArray(body.items)?body.items:Array.isArray(body.products)?body.products:Array.isArray(body.results)?body.results:null;
       if(!products){report.errors.push({chain,ingredient:step.ingredient.name,kind:'unexpected_response_shape',keys:Object.keys(body).slice(0,15)});continue;}
       const acceptable=products.filter(p=>recipeProductCompatible(step.ingredient.name,p));
       step.chainResults.push({chain,rawCount:products.length,acceptedCount:acceptable.length,accepted:acceptable.slice(0,12).map(p=>({name:p.name||p.title,price:p.price??p.priceCents??p.storeItems?.[0]?.price??null}))});
     }catch(e){report.errors.push({chain,ingredient:step.ingredient.name,kind:'fetch_failed',message:String(e)});}
   }
 }
 fs.mkdirSync('chili-audit-output',{recursive:true});
 fs.writeFileSync('chili-audit-output/'+mode+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({mode,parsed:report.parsed.length,searchSteps:report.steps.length,completed:report.steps.filter(s=>s.chainResults.length>0).length,accessBlocked:report.accessBlocked,errors:report.errors.length},null,2));
 if(report.accessBlocked){console.error('BETA ACCESS BLOCKED: GitHub Actions runner receives HTTP 401/403. Live product results cannot be validated without approved test access.');process.exitCode=2;}
 else if(report.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

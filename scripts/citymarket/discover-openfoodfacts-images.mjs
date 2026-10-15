import fs from 'node:fs';
import path from 'node:path';

// Opt-in discovery only. Queries Open Food Facts; never modifies published images or prices.
// Usage: node scripts/citymarket/discover-openfoodfacts-images.mjs plan.json candidates.json [maxTasks]
const [input,output,maxArg]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/citymarket/discover-openfoodfacts-images.mjs <plan.json> <candidates.json> [maxTasks]');
const plan=JSON.parse(fs.readFileSync(input,'utf8'));
const maxTasks=maxArg===undefined?5:Number(maxArg);
if(!Number.isInteger(maxTasks)||maxTasks<1||maxTasks>20)throw Error('maxTasks must be 1..20');
if(plan.schemaVersion!==1||plan.mode!=='offline-image-discovery'||plan.readOnly!==true||plan.autoApply!==false||!Array.isArray(plan.tasks)||plan.taskCount!==plan.tasks.length)throw Error('Invalid read-only discovery plan');
const items=[];
for(const task of plan.tasks.slice(0,maxTasks)){
 if(task.pdfSha256!==plan.pdfSha256||task.publication!==plan.publication||task.autoApply!==false||task.requiresManualVerification!==true||!task.offerId?.startsWith('kcm:spatial:'))throw Error('Unsafe discovery task');
 const query=task.query.trim();
 if(!query||query.length>160)throw Error('Invalid product query');
 const params=new URLSearchParams({search_terms:query,search_simple:'1',action:'process',json:'1',page_size:'5',fields:'code,product_name,brands,image_front_url'});
 const endpoint='https://world.openfoodfacts.org/cgi/search.pl?'+params.toString();
 let images=[];
 try{
  const response=await fetch(endpoint,{headers:{'User-Agent':'Ziiply-ImageDiscovery/0.1 (manual review only)','Accept':'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.json();
  images=(Array.isArray(payload.products)?payload.products:[]).filter(p=>typeof p.image_front_url==='string'&&p.image_front_url.startsWith('https://')).slice(0,5).map(p=>({url:p.image_front_url,source:'Open Food Facts; EAN '+String(p.code||'unknown')+'; '+String(p.product_name||'unnamed').slice(0,120)+'; '+String(p.brands||'').slice(0,80),ean:/^\d{8,14}$/.test(String(p.code||''))?String(p.code):null,productName:String(p.product_name||'').slice(0,160),brand:String(p.brands||'').slice(0,100),identityVerified:false}));
 }catch(error){console.warn('KCM_IMAGE_DISCOVERY_LOOKUP_FAILED',JSON.stringify({offerId:task.offerId,error:String(error.message||error)}));}
 items.push({offerId:task.offerId,images});
 console.log('KCM_IMAGE_DISCOVERY_PROGRESS',JSON.stringify({done:items.length,total:Math.min(plan.tasks.length,maxTasks),candidates:images.length}));
}
const result={schemaVersion:1,publication:plan.publication,pdfSha256:plan.pdfSha256,items};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('KCM_IMAGE_DISCOVERY_FINISHED',JSON.stringify({output,lookups:items.length,withCandidates:items.filter(i=>i.images.length).length}));

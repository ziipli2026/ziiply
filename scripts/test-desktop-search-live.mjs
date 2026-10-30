import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
if(!process.env.VERCEL_TOKEN){console.error('Missing VERCEL_TOKEN GitHub Actions secret: cannot access protected preview.');process.exit(2);}

const base=(process.env.PREVIEW_URL||'https://ziiply-git-preview-legacy-desktop-ui-ziipli2026s-projects.vercel.app').replace(/\/$/,'');
const queries=['maito','juusto','jogurtti','leipä','voi','kananmuna','kerma','piimä','rahka','riisi','pasta','peruna','porkkana','tomaatti','kurkku','banaani','omena','appelsiini','kahvi','tee','sokeri','suola','jauheliha','kana','lohi','makkara','kinkku','murot','kaurahiutale','öljy','jauho','mehu','vesi','pakastepizza','jäätelö'];
const stores=[{chain:'K',path:'/api/k-products',store:'3221'},{chain:'S',path:'/api/s-products',store:'292',storeName:'Prisma Hyvinkää',storeType:'hyper'}];
const results=[];
for(const query of queries){
 for(const source of stores){
  const url=new URL(source.path,base);url.searchParams.set('search',query);url.searchParams.set('store',source.store);
  if(source.storeName)url.searchParams.set('storeName',source.storeName);
  if(source.storeType)url.searchParams.set('storeType',source.storeType);
  const start=Date.now();let entry={query,chain:source.chain,status:null,count:0,ms:0,errors:[],examples:[]};
  try{
   // Vercel CLI authenticates protected preview requests using the GitHub secret.
   const raw=execFileSync('vercel',['curl',url.toString(),'-sS','-f'],{encoding:'utf8',timeout:30000,env:process.env});
   entry.status=200;
   const body=JSON.parse(raw);
   const items=Array.isArray(body.products)?body.products:Array.isArray(body.items)?body.items:Array.isArray(body)?body:[];
   entry.count=items.length;
   entry.examples=items.slice(0,6).map(p=>({name:p.name||p.title,category:p.category,ean:p.ean,price:p.price}));
   if(!Array.isArray(items))entry.errors.push('invalid product array');
   for(const p of items){if(!(p.name||p.title||p.productName))entry.errors.push('missing name');if(p.price!=null&&!Number.isFinite(Number(p.price)))entry.errors.push('invalid price');}
  }catch(e){entry.errors.push(String(e));}
  entry.ms=Date.now()-start;entry.errors=[...new Set(entry.errors)];
  results.push(entry);console.log(query,source.chain,entry.status,entry.count,entry.errors.join(';'));
 }
}
const report={target:base,runAt:new Date().toISOString(),queryCount:queries.length,requestCount:results.length,failures:results.filter(r=>r.errors.length).length,results};
writeFileSync('desktop-search-35-category-report.json',JSON.stringify(report,null,2));
writeFileSync('desktop-search-35-category-summary.md','# Desktop preview: 35 search terms / 70 live provider requests\n\nTarget: '+base+'\n\n| Query | Chain | HTTP | Results | Errors |\n|---|---|---:|---:|---|\n'+results.map(r=>'| '+r.query+' | '+r.chain+' | '+(r.status??'-')+' | '+r.count+' | '+(r.errors.join(', ')||'-')+' |').join('\n')+'\n\nNote: This tests live provider APIs, not the rendered desktop UI, Neon merge, or category relevance.\n');
if(report.failures)process.exitCode=1;

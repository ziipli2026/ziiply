import { neon } from '@neondatabase/serverless';
const raw=process.env.ZIIPLY_DATABASE_URL || process.env.DATABASE_URL;
if (!raw) throw Error('Missing ZIIPLY_DATABASE_URL or DATABASE_URL secret');
const databaseUrl=new URL(raw);
databaseUrl.pathname='/neondb';
const sql=neon(databaseUrl.toString());
const check=await sql`SELECT current_database() AS db, to_regclass('public.ziiply_ean_products') AS product_table`;
if(!check[0]?.product_table) throw Error('Wrong Neon project/schema: ziiply_ean_products missing in neondb');
console.log('Verified Ziiply database:',check[0].db);
const rows=await sql`SELECT ean,name FROM ziiply_ean_products WHERE ean ~ '^[0-9]{13}$' AND name <> '' ORDER BY md5(ean || 'ziiply-500-audit-20261031') LIMIT 500`;
const base='https://ziiply-git-preview-legacy-desktop-ui-ziipli2026s-projects.vercel.app';
const stats={total:rows.length,valid:0,missing:0,errors:0,direct:0,fineli:0,variant:0};
const issues=[];
for(let i=0;i<rows.length;i+=10){
 await Promise.all(rows.slice(i,i+10).map(async p=>{
  try {
   const r=await fetch(base+'/api/ean-bank?ean='+p.ean,{signal:AbortSignal.timeout(30000)});
   const data=await r.json();
   if(!r.ok||data.product?.ean!==p.ean)throw Error('API or EAN mismatch');
   const n=data.product.nutrition;
   if(n&&Number.isFinite(Number(n.kcal_100g))&&Number(n.kcal_100g)>=0&&Number(n.kcal_100g)<=1000){
    stats.valid++;
    if(n.source==='package-variant')stats.variant++;
    else if(n.source==='fineli-generic')stats.fineli++;
    else stats.direct++;
   }else{
    stats.missing++;
    if(issues.length<60)issues.push({ean:p.ean,name:p.name,issue:'missing/invalid kcal'});
   }
  }catch(e){
   stats.errors++;
   if(issues.length<60)issues.push({ean:p.ean,name:p.name,issue:String(e)});
  }
 }));
 console.log('Progress',Math.min(i+10,rows.length),'/',rows.length);
}
console.log('AUDIT_RESULT_JSON',JSON.stringify({stats,issues}));
if(stats.total!==500||stats.errors)process.exitCode=1;

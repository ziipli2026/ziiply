// Run: DATABASE_URL=... node scripts/import-off-nutrition.mjs --limit=100
// Isolated ODbL staging data; do not merge into proprietary product tables.
import pg from 'pg';
const {Pool}=pg;
const shard=Math.max(0,Math.min(9,Number(process.argv.find(x=>x.startsWith('--shard='))?.split('=')[1]||0)));
const limit=Math.min(10,Math.max(1,Number(process.argv.find(x=>x.startsWith('--limit='))?.split('=')[1]||10)));
const refreshIncomplete=process.argv.includes('--refresh-incomplete');
const progressEvery=1;
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:12000,query_timeout:30000});
// Single-process pacing; GitHub runs one shard at a time to avoid cross-run DB locks.
let nextApiAt=0;
async function reserveApiSlot(){
 const delay=Math.max(0,nextApiAt-Date.now());
 if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
 nextApiAt=Date.now()+4200;
}
const num=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const tags=x=>Array.isArray(x)?x.filter(v=>typeof v==='string'): [];
const has=(arr,word)=>arr.some(t=>t.toLowerCase().includes(word));
try {
 const check=await pool.query("SELECT current_database() AS database, current_schema() AS schema, to_regclass('public.ziiply_ean_products')::text AS products, to_regclass('public.ziiply_off_nutrition')::text AS nutrition");
 const target=check.rows[0];
 console.log('DATABASE_CHECK',JSON.stringify(target));
 if(!target.products||!target.nutrition)throw Error('Wrong Neon database or missing schema: both public.ziiply_ean_products and public.ziiply_off_nutrition must exist. Check GitHub Actions DATABASE_URL secret.');
 await pool.query('CREATE TABLE IF NOT EXISTS public.ziiply_off_lookup_status (ean text PRIMARY KEY, status text NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now(), error text)');
 const {rows}=await pool.query(`
 SELECT p.ean, (n.ean IS NOT NULL) AS previously_imported
 FROM public.ziiply_ean_products p
 LEFT JOIN public.ziiply_off_nutrition n ON n.ean=p.ean
 LEFT JOIN public.ziiply_off_lookup_status a ON a.ean=p.ean
 WHERE p.ean ~ '^[0-9]{8,14}$'
   AND p.ean !~ '^2[0-9]{12}$'
   AND length(trim(coalesce(p.name,''))) > 2
   AND lower(p.name) !~ '(play-doh|ryhmä hau|bloomables|flexfigs|lelu|lelut|pehmolelu|figuuri|palapeli|lautapeli|värityskirja|askartelu|paristo|patteri|pesuaine|shampoo|saippua|hammastahna|wc-paperi|talouspaperi|vaippa|roskapussi|astianpesu|pyykinpesu|kissanhiekka|koiranruoka|kissanruoka|lemmikin|olut|siideri|lonkero|viini|vodka)'
   AND right(p.ean,1)::int=$2
   AND (
     (n.ean IS NULL AND (
       a.ean IS NULL
       OR (a.status='not_found' AND a.attempted_at < now()-interval '30 days')
       OR (a.status='error' AND a.attempted_at < now()-interval '1 day')
       OR (a.status='found' AND a.attempted_at < now()-interval '1 day')
     ))
     OR ($3::boolean AND n.ean IS NOT NULL
       AND (n.kcal_100g IS NULL OR n.fat_100g IS NULL
         OR n.carbohydrates_100g IS NULL OR n.proteins_100g IS NULL OR n.salt_100g IS NULL)
       AND n.fetched_at < now()-interval '1 day')
   )
 ORDER BY CASE WHEN $3::boolean AND n.ean IS NOT NULL THEN 0 ELSE 1 END, p.ean
 LIMIT $1`,[limit,shard,refreshIncomplete]);
 console.log('OFF_SELECTED',JSON.stringify({shard,selected:rows.length,firstEans:rows.slice(0,3).map(r=>r.ean)}));
 let matched=0,notFound=0,failed=0,refreshed=0,newRecords=0,withoutNutrition=0;
 for(const [i,{ean,previously_imported}] of rows.entries()){
  try{
   await reserveApiSlot();
   const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(ean)+'.json?fields=code,product_name,nutriments,allergens_tags,traces_tags,labels_tags,ingredients_analysis_tags',{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Ziiply/1.0 (https://ziiply.fi; nutrition research)'}});
   if(response.status===404){notFound++;if(!previously_imported)await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status) VALUES($1,'not_found') ON CONFLICT(ean) DO UPDATE SET status='not_found',attempted_at=now(),error=NULL",[ean]);throw Error('OFF_NOT_FOUND '+ean);}
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(data.status!==1||!data.product){notFound++;if(!previously_imported)await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status) VALUES($1,'not_found') ON CONFLICT(ean) DO UPDATE SET status='not_found',attempted_at=now(),error=NULL",[ean]);throw Error('OFF_NOT_FOUND '+ean);}
   const p=data.product,n=p.nutriments||{},labels=tags(p.labels_tags),analysis=tags(p.ingredients_analysis_tags);
   // null means unknown, not false. Ingredient-derived claims are not verified free-from certifications.
   const dietary={gluten_free:has(labels,'gluten-free')?true:null,lactose_free:has(labels,'lactose-free')?true:null,dairy_free:has(labels,'dairy-free')?true:null,vegan:has(labels,'vegan')?true:has(analysis,'non-vegan')?false:null,vegetarian:has(labels,'vegetarian')?true:has(analysis,'non-vegetarian')?false:null};
   if(!Object.values(n).some((v)=>v!==null&&v!==undefined&&v!=='')){withoutNutrition++;}
   await pool.query(`INSERT INTO public.ziiply_off_nutrition (ean,product_name,kcal_100g,kj_100g,fat_100g,saturated_fat_100g,carbohydrates_100g,sugars_100g,fiber_100g,proteins_100g,salt_100g,allergens,traces,labels,dietary,source_url,fetched_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
ON CONFLICT (ean) DO UPDATE SET product_name=EXCLUDED.product_name,kcal_100g=COALESCE(EXCLUDED.kcal_100g,ziiply_off_nutrition.kcal_100g),kj_100g=COALESCE(EXCLUDED.kj_100g,ziiply_off_nutrition.kj_100g),fat_100g=COALESCE(EXCLUDED.fat_100g,ziiply_off_nutrition.fat_100g),saturated_fat_100g=COALESCE(EXCLUDED.saturated_fat_100g,ziiply_off_nutrition.saturated_fat_100g),carbohydrates_100g=COALESCE(EXCLUDED.carbohydrates_100g,ziiply_off_nutrition.carbohydrates_100g),sugars_100g=COALESCE(EXCLUDED.sugars_100g,ziiply_off_nutrition.sugars_100g),fiber_100g=COALESCE(EXCLUDED.fiber_100g,ziiply_off_nutrition.fiber_100g),proteins_100g=COALESCE(EXCLUDED.proteins_100g,ziiply_off_nutrition.proteins_100g),salt_100g=COALESCE(EXCLUDED.salt_100g,ziiply_off_nutrition.salt_100g),allergens=EXCLUDED.allergens,traces=EXCLUDED.traces,labels=EXCLUDED.labels,dietary=EXCLUDED.dietary,source_url=EXCLUDED.source_url,fetched_at=now()`,[ean,p.product_name||null,num(n['energy-kcal_100g']),num(n['energy-kj_100g']),num(n.fat_100g),num(n['saturated-fat_100g']),num(n.carbohydrates_100g),num(n.sugars_100g),num(n.fiber_100g),num(n.proteins_100g),num(n.salt_100g),tags(p.allergens_tags),tags(p.traces_tags),labels,JSON.stringify(dietary),'https://world.openfoodfacts.org/product/'+ean]);
   await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status) VALUES($1,'found') ON CONFLICT(ean) DO UPDATE SET status='found',attempted_at=now(),error=NULL",[ean]);
   matched++;if(previously_imported)refreshed++;else newRecords++;
  }catch(error){
   const missing=String(error.message).startsWith('OFF_NOT_FOUND ');
   if(!missing){
    failed++;
    console.error('::error::OFF_FATAL',JSON.stringify({shard,ean,error:String(error.message)}));
    try{await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status,error) VALUES($1,'error',$2) ON CONFLICT(ean) DO UPDATE SET status='error',attempted_at=now(),error=EXCLUDED.error",[ean,String(error.message).slice(0,300)]);}catch(logError){console.error('OFF_ERROR_LOG_FAILED',logError.message);}
   }else console.error('::error::OFF_NOT_FOUND',JSON.stringify({shard,ean}));
   throw error;
  }finally{
   console.log('OFF_PROGRESS',JSON.stringify({shard,processed:i+1,selected:rows.length,matched,newRecords,notFound,failed,refreshed}));
  }
  // API starts are globally spaced across all shards.
 }
 const total=await pool.query('SELECT count(*)::int AS total FROM public.ziiply_off_nutrition');
 const report={shard,attempted:rows.length,newRecords,matched,refreshed,notFound,failed,withoutNutrition,total:total.rows[0].total};
 console.log('OFF_IMPORT_REPORT',JSON.stringify(report));
 if(rows.length>0&&newRecords===0)console.warn('::warning::OFF import added ZERO new products; inspected '+rows.length+' EANs, not found '+notFound+', errors '+failed+', refreshed '+refreshed);
 if(failed>0&&failed===rows.length)throw Error('OFF import failed for every attempted EAN');
 if(failed>0)console.warn('Transient lookup failures will retry after 24 hours');
}finally{await pool.end()}

// Run: DATABASE_URL=... node scripts/import-off-nutrition.mjs --limit=100
// Isolated ODbL staging data; do not merge into proprietary product tables.
import pg from 'pg';
const {Pool}=pg;
const limit=Math.min(200,Math.max(1,Number(process.argv.find(x=>x.startsWith('--limit='))?.split('=')[1]||100)));
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const num=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
const tags=x=>Array.isArray(x)?x.filter(v=>typeof v==='string'): [];
const has=(arr,word)=>arr.some(t=>t.toLowerCase().includes(word));
try {
 const check=await pool.query("SELECT current_database() AS database, current_schema() AS schema, to_regclass('public.ziiply_ean_products')::text AS products, to_regclass('public.ziiply_off_nutrition')::text AS nutrition");
 const target=check.rows[0];
 console.log('DATABASE_CHECK',JSON.stringify(target));
 if(!target.products||!target.nutrition)throw Error('Wrong Neon database or missing schema: both public.ziiply_ean_products and public.ziiply_off_nutrition must exist. Check GitHub Actions DATABASE_URL secret.');
 await pool.query('CREATE TABLE IF NOT EXISTS public.ziiply_off_lookup_status (ean text PRIMARY KEY, status text NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now(), error text)');
 const {rows}=await pool.query('SELECT ean FROM public.ziiply_ean_products WHERE ean ~ \'^[0-9]{8,14}$\' AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition n WHERE n.ean=ziiply_ean_products.ean) AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_lookup_status t WHERE t.ean=ziiply_ean_products.ean AND (t.status IN ('found','not_found') OR t.attempted_at > now() - interval '24 hours')) ORDER BY ean LIMIT $1',[limit]);
 let matched=0,notFound=0,failed=0;
 for(const [i,{ean}] of rows.entries()){
  try{
   const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(ean)+'.json?fields=code,product_name,nutriments,allergens_tags,traces_tags,labels_tags,ingredients_analysis_tags',{headers:{'User-Agent':'Ziiply/1.0 (https://ziiply.fi; nutrition research)'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(data.status!==1||!data.product){notFound++;await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status) VALUES($1,'not_found') ON CONFLICT(ean) DO UPDATE SET status='not_found',attempted_at=now(),error=NULL",[ean]);continue;}
   const p=data.product,n=p.nutriments||{},labels=tags(p.labels_tags),analysis=tags(p.ingredients_analysis_tags);
   // null means unknown, not false. Ingredient-derived claims are not verified free-from certifications.
   const dietary={gluten_free:has(labels,'gluten-free')?true:null,lactose_free:has(labels,'lactose-free')?true:null,dairy_free:has(labels,'dairy-free')?true:null,vegan:has(labels,'vegan')?true:has(analysis,'non-vegan')?false:null,vegetarian:has(labels,'vegetarian')?true:has(analysis,'non-vegetarian')?false:null};
   await pool.query(`INSERT INTO public.ziiply_off_nutrition (ean,product_name,kcal_100g,kj_100g,fat_100g,saturated_fat_100g,carbohydrates_100g,sugars_100g,fiber_100g,proteins_100g,salt_100g,allergens,traces,labels,dietary,source_url,fetched_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
ON CONFLICT (ean) DO UPDATE SET product_name=EXCLUDED.product_name,kcal_100g=EXCLUDED.kcal_100g,kj_100g=EXCLUDED.kj_100g,fat_100g=EXCLUDED.fat_100g,saturated_fat_100g=EXCLUDED.saturated_fat_100g,carbohydrates_100g=EXCLUDED.carbohydrates_100g,sugars_100g=EXCLUDED.sugars_100g,fiber_100g=EXCLUDED.fiber_100g,proteins_100g=EXCLUDED.proteins_100g,salt_100g=EXCLUDED.salt_100g,allergens=EXCLUDED.allergens,traces=EXCLUDED.traces,labels=EXCLUDED.labels,dietary=EXCLUDED.dietary,source_url=EXCLUDED.source_url,fetched_at=now()`,[ean,p.product_name||null,num(n['energy-kcal_100g']),num(n['energy-kj_100g']),num(n.fat_100g),num(n['saturated-fat_100g']),num(n.carbohydrates_100g),num(n.sugars_100g),num(n.fiber_100g),num(n.proteins_100g),num(n.salt_100g),tags(p.allergens_tags),tags(p.traces_tags),labels,JSON.stringify(dietary),'https://world.openfoodfacts.org/product/'+ean]);
   await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status) VALUES($1,'found') ON CONFLICT(ean) DO UPDATE SET status='found',attempted_at=now(),error=NULL",[ean]);
   matched++;
  }catch(error){failed++;console.error(ean,error.message);await pool.query("INSERT INTO public.ziiply_off_lookup_status(ean,status,error) VALUES($1,'error',$2) ON CONFLICT(ean) DO UPDATE SET status='error',attempted_at=now(),error=EXCLUDED.error",[ean,String(error.message).slice(0,300)]);}
  if(i<rows.length-1)await sleep(4200); // <= 15 product reads per minute
 }
 console.log(JSON.stringify({attempted:rows.length,matched,notFound,failed}));
}finally{await pool.end()}

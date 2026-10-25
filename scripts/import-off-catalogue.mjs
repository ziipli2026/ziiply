// Collect OFF's Finnish food catalogue independently of Ziiply's existing EANs.
// Keep ODbL source data isolated. Do not merge into proprietary product tables.
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL) throw Error('DATABASE_URL is required');
const pages=Math.min(20,Math.max(1,Number(process.argv.find(x=>x.startsWith('--pages='))?.split('=')[1]||5)));
const pageSize=100;
const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:12000});
let fetched=0,inserted=0,updated=0,skipped=0;
try {
 await pool.query(`CREATE TABLE IF NOT EXISTS public.ziiply_off_catalogue_staging (
   ean text PRIMARY KEY,
   product_name text,
   brands text,
   categories text,
   nutriments jsonb,
   source_url text NOT NULL,
   source_license text NOT NULL DEFAULT 'ODbL / Open Food Facts',
   fetched_at timestamptz NOT NULL DEFAULT now()
 )`);
 for(let page=1;page<=pages;page++){
  const params=new URLSearchParams({
   action:'process',json:'1',search_simple:'1',
   tagtype_0:'countries',tag_contains_0:'contains',tag_0:'finland',
   page_size:String(pageSize),page:String(page),
   fields:'code,product_name,brands,categories,nutriments'
  });
  const url='https://world.openfoodfacts.org/cgi/search.pl?'+params;
  const response=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'Ziiply/1.0 (https://ziiply.fi; OFF catalogue enrichment)'}});
  if(!response.ok)throw Error('OFF catalogue HTTP '+response.status+' on page '+page);
  const payload=await response.json();
  const products=Array.isArray(payload.products)?payload.products:[];
  for(const p of products){
   fetched++;
   const ean=String(p.code||'').trim();
   if(!/^[0-9]{8,14}$/.test(ean)||!p.product_name||!p.nutriments||Object.keys(p.nutriments).length===0){skipped++;continue;}
   const result=await pool.query(`INSERT INTO public.ziiply_off_catalogue_staging
    (ean,product_name,brands,categories,nutriments,source_url)
    VALUES($1,$2,$3,$4,$5::jsonb,$6)
    ON CONFLICT(ean) DO UPDATE SET
      product_name=EXCLUDED.product_name,brands=EXCLUDED.brands,
      categories=EXCLUDED.categories,nutriments=EXCLUDED.nutriments,
      fetched_at=now()
    RETURNING (xmax = 0) AS inserted`,
    [ean,p.product_name,p.brands||null,p.categories||null,JSON.stringify(p.nutriments),
    'https://world.openfoodfacts.org/product/'+ean]);
   if(result.rows[0]?.inserted)inserted++;else updated++;
  }
  console.log('OFF_CATALOGUE_PAGE',JSON.stringify({page,received:products.length,fetched,inserted,updated,skipped}));
  if(products.length<pageSize)break;
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
 console.log('OFF_CATALOGUE_REPORT',JSON.stringify({fetched,inserted,updated,skipped}));
}finally{await pool.end()}

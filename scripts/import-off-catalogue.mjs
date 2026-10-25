// Collect OFF's Finnish food catalogue independently of Ziiply's existing EANs.
// Keep ODbL source data isolated. Do not merge into proprietary product tables.
import pg from 'pg';
const {Pool}=pg;
if(!process.env.DATABASE_URL) throw Error('DATABASE_URL is required');
const pages=Math.min(20,Math.max(1,Number(process.argv.find(x=>x.startsWith('--pages='))?.split('=')[1]||5)));
const startPage=Math.max(1,Number(process.argv.find(x=>x.startsWith('--start-page='))?.split('=')[1]||1));
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
 let lastCompletedPage=startPage-1;
 const failedPages=[];
 for(let page=startPage;page<startPage+pages;page++){
  // Prefer the OFF API v2 search endpoint. Legacy CGI search can return HTTP 503.
  const params=new URLSearchParams({
   countries_tags:'en:finland',page_size:String(pageSize),page:String(page),
   fields:'code,product_name,brands,categories,nutriments'
  });
  const endpoints=[
   'https://world.openfoodfacts.org/api/v2/search?'+params,
   'https://world.openfoodfacts.org/cgi/search.pl?'+new URLSearchParams({
    action:'process',json:'1',search_simple:'1',
    tagtype_0:'countries',tag_contains_0:'contains',tag_0:'finland',
    page_size:String(pageSize),page:String(page),
    fields:'code,product_name,brands,categories,nutriments'
   })
  ];
  let payload=null;
  for(const url of endpoints){
   for(let attempt=1;attempt<=3;attempt++){
    try{
     const response=await fetch(url,{
      signal:AbortSignal.timeout(45000),
      headers:{'User-Agent':'Ziiply/1.0 (https://ziiply.fi; Finnish OFF nutrition catalogue)','Accept':'application/json'}
     });
     if(response.ok){
      const candidate=await response.json();
      if(Array.isArray(candidate.products)){payload=candidate;break;}
      console.warn('OFF_CATALOGUE_INVALID_RESPONSE',JSON.stringify({page,url,attempt}));
     }else{
      console.warn('OFF_CATALOGUE_HTTP',JSON.stringify({page,status:response.status,attempt,url}));
      if(![429,500,502,503,504].includes(response.status))break;
     }
    }catch(error){
     console.warn('OFF_CATALOGUE_NETWORK',JSON.stringify({page,attempt,message:String(error.message)}));
    }
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,Math.min(12000,2000*2**(attempt-1))));
   }
   if(payload)break;
  }
  if(!payload){
   failedPages.push(page);
   console.warn('OFF_CATALOGUE_SKIPPED_PAGE',JSON.stringify({page,reason:'OFF endpoints unavailable; continue with next page'}));
   continue;
  }
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
  lastCompletedPage=page;
  console.log('OFF_CATALOGUE_PAGE',JSON.stringify({page,received:products.length,fetched,inserted,updated,skipped}));
  if(products.length<pageSize)break;
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
 console.log('OFF_CATALOGUE_REPORT',JSON.stringify({fetched,inserted,updated,skipped,startPage,lastCompletedPage,failedPages,nextStartPage:startPage+pages}));
}finally{await pool.end()}

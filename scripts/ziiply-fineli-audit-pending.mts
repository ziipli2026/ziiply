import { neon } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = neon(url);
const rows = await sql`
  SELECT ean,fineli_id,evidence->>'productName' AS product_name,
         evidence->>'fineliName' AS fineli_name
  FROM public.ziiply_ean_fineli_candidates
  WHERE method='category_token_overlap' AND status='pending'
  ORDER BY ean,fineli_id
`;
const unsafe = /(?:koiran|koiralle|koirille|kissan|kissalle|kissoille|lemmik|levite|tuorejuusto|monivilja|quinoa|seos|sekoitus|nuudeli|keitto|salaatti|pizza|ateria|kastike|long drink|suklaa|patukka|juustoperun)/i;
const preparation = ['paistettu','keitetty','kypsennetty','savustettu','kuivattu','pakaste','kuorittu','jauhettu'];
const flags = (product, food) => {
  const issues = [];
  if (unsafe.test(product)) issues.push('composite_or_nonhuman_product');
  for (const term of preparation) if (food.includes(term) && !product.includes(term)) issues.push('preparation_'+term);
  for (const term of ['gluteeniton','laktoositon','rasvaton','kevyt','makeuttamaton','sokeroimaton']) if (product.includes(term) && !food.includes(term)) issues.push('attribute_'+term);
  const p = product.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const f = food.match(/rasvaa\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (p && f && Math.abs(Number(p[1].replace(',','.'))-Number(f[1].replace(',','.'))) > 0.1) issues.push('fat_percentage_mismatch');
  return issues;
};
let flagged=0;
const review = rows.map(r=>{
  const product=String(r.product_name??'').toLowerCase();
  const food=String(r.fineli_name??'').toLowerCase();
  const issues=flags(product,food);
  if(issues.length) flagged++;
  return {ean:r.ean,fineli_id:r.fineli_id,product:r.product_name,fineli:r.fineli_name,issues,decision:issues.length?'REJECT_REVIEW':'MANUAL_REVIEW'};
});
console.log(JSON.stringify({mode:'read_only_pending_audit',total:review.length,flagged,manual_review:review.length-flagged,modified:0}));
for(const row of review) console.log(JSON.stringify(row));
